import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { SignJWT, jwtVerify } from "jose";
import * as db from "./db";
import { downloadAndSaveImage } from "./localStorage";

const ADMIN_COOKIE_NAME = "admin_session";
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret-key");

// Helper to create admin JWT token
async function createAdminToken(adminId: number, username: string): Promise<string> {
  return new SignJWT({ adminId, username, type: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

// Helper to verify admin JWT token
async function verifyAdminToken(token: string): Promise<{ adminId: number; username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.type !== "admin") return null;
    return { adminId: payload.adminId as number, username: payload.username as string };
  } catch {
    return null;
  }
}

// Admin procedure - checks admin authentication
const adminProcedure = publicProcedure.use(async ({ ctx, next }) => {
  // Check cookie first, then Authorization header
  let token = ctx.req.cookies?.[ADMIN_COOKIE_NAME];
  if (!token) {
    const authHeader = ctx.req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }
  
  if (!token) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Admin authentication required" });
  }

  const tokenData = await verifyAdminToken(token);
  if (!tokenData) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired admin session" });
  }

  const adminUser = await db.getAdminUserById(tokenData.adminId);
  if (!adminUser) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Admin user not found" });
  }

  return next({
    ctx: {
      ...ctx,
      adminUser,
    },
  });
});

export const appRouter = router({
  system: systemRouter,

  // Admin authentication router (local login/password)
  adminAuth: router({
    // Login with username/password
    login: publicProcedure
      .input(z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const adminUser = await db.verifyAdminPassword(input.username, input.password);
        
        if (!adminUser) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid username or password" });
        }

        const token = await createAdminToken(adminUser.id, adminUser.username);
        
        // Set cookie - httpOnly: false for preview mode compatibility
        // In production with custom domain, httpOnly: true is recommended
        ctx.res.cookie(ADMIN_COOKIE_NAME, token, {
          httpOnly: false,
          secure: true,
          sameSite: "none",
          path: "/",
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        return {
          success: true,
          token, // Return token for localStorage storage
          user: {
            id: adminUser.id,
            username: adminUser.username,
            name: adminUser.name,
          },
        };
      }),

    // Logout
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(ADMIN_COOKIE_NAME, {
        httpOnly: false,
        secure: true,
        sameSite: "none",
        path: "/",
      });
      return { success: true };
    }),

    // Get current admin user
    me: publicProcedure.query(async ({ ctx }) => {
      // Check cookie first, then Authorization header
      let token = ctx.req.cookies?.[ADMIN_COOKIE_NAME];
      if (!token) {
        const authHeader = ctx.req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          token = authHeader.slice(7);
        }
      }
      if (!token) return null;

      const tokenData = await verifyAdminToken(token);
      if (!tokenData) return null;

      const adminUser = await db.getAdminUserById(tokenData.adminId);
      if (!adminUser) return null;

      return {
        id: adminUser.id,
        username: adminUser.username,
        name: adminUser.name,
      };
    }),

    // Create new admin user (only accessible by existing admins)
    createUser: adminProcedure
      .input(z.object({
        username: z.string().min(3).max(64),
        password: z.string().min(6),
        name: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const existing = await db.getAdminUserByUsername(input.username);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Username already exists" });
        }

        const newUser = await db.createAdminUser(input.username, input.password, input.name);
        if (!newUser) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create user" });
        }

        return {
          success: true,
          user: {
            id: newUser.id,
            username: newUser.username,
            name: newUser.name,
          },
        };
      }),

    // Change password
    changePassword: adminProcedure
      .input(z.object({
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ input, ctx }) => {
        const success = await db.updateAdminPassword((ctx as any).adminUser.id, input.newPassword);
        return { success };
      }),
  }),

  // Public containers router
  containers: router({
    // Get all active containers for catalog
    list: publicProcedure
      .input(z.object({
        size: z.string().optional(),
        condition: z.enum(["new", "used"]).optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        let containers = await db.getAllContainers(true);
        
        // Apply filters
        if (input?.size) {
          containers = containers.filter(c => c.size.toLowerCase().includes(input.size!.toLowerCase()));
        }
        if (input?.condition) {
          containers = containers.filter(c => c.condition === input.condition);
        }
        if (input?.search) {
          const searchLower = input.search.toLowerCase();
          containers = containers.filter(c => 
            c.name.toLowerCase().includes(searchLower) ||
            c.externalId.toLowerCase().includes(searchLower)
          );
        }

        // Get main photo for each container
        const containersWithPhotos = await Promise.all(
          containers.map(async (container) => {
            const mainPhoto = await db.getMainPhotoByContainerId(container.id);
            return {
              ...container,
              mainPhoto: mainPhoto?.url || null,
            };
          })
        );

        return containersWithPhotos;
      }),

    // Get single container with all photos
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const container = await db.getContainerById(input.id);
        if (!container) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Container not found" });
        }

        const photos = await db.getPhotosByContainerId(container.id);

        return {
          ...container,
          photos,
        };
      }),

    // Get unique sizes for filter dropdown
    getSizes: publicProcedure.query(async () => {
      const containers = await db.getAllContainers(true);
      const sizes = Array.from(new Set(containers.map(c => c.size)));
      return sizes.sort();
    }),
  }),

  // Admin containers management
  adminContainers: router({
    // Get all containers (including inactive)
    list: adminProcedure.query(async () => {
      const containers = await db.getAllContainers(false);
      
      const containersWithPhotos = await Promise.all(
        containers.map(async (container) => {
          const photos = await db.getPhotosByContainerId(container.id);
          return {
            ...container,
            photos,
          };
        })
      );

      return containersWithPhotos;
    }),

    // Update container
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        size: z.string().optional(),
        condition: z.enum(["new", "used"]).optional(),
        price: z.string().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const success = await db.updateContainer(id, data);
        return { success };
      }),

    // Update photo order
    updatePhotoOrder: adminProcedure
      .input(z.object({
        photoId: z.number(),
        displayOrder: z.number(),
      }))
      .mutation(async ({ input }) => {
        const success = await db.updatePhotoOrder(input.photoId, input.displayOrder);
        return { success };
      }),

    // Set main photo
    setMainPhoto: adminProcedure
      .input(z.object({
        containerId: z.number(),
        photoId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const success = await db.setMainPhoto(input.containerId, input.photoId);
        return { success };
      }),

    // Reorder all photos for a container
    reorderPhotos: adminProcedure
      .input(z.object({
        containerId: z.number(),
        photoIds: z.array(z.number()),
      }))
      .mutation(async ({ input }) => {
        // Update each photo's display order based on array position
        for (let i = 0; i < input.photoIds.length; i++) {
          await db.updatePhotoOrder(input.photoIds[i], i + 1);
        }
        return { success: true };
      }),

    // Delete photo
    deletePhoto: adminProcedure
      .input(z.object({ photoId: z.number() }))
      .mutation(async ({ input }) => {
        const success = await db.deletePhoto(input.photoId);
        return { success };
      }),

    // Import CSV
    importCsv: adminProcedure
      .input(z.object({
        data: z.array(z.object({
          externalId: z.string(),
          name: z.string(),
          size: z.string(),
          condition: z.enum(["new", "used"]),
          price: z.string().optional(),
          photoUrls: z.array(z.string()),
        })),
        filename: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const adminUser = (ctx as any).adminUser;
        
        // Create import record
        const importId = await db.createImportRecord({
          adminUserId: adminUser.id,
          filename: input.filename,
          status: "processing",
        });

        let added = 0;
        let updated = 0;
        const processedIds: string[] = [];

        try {
          for (const item of input.data) {
            processedIds.push(item.externalId);
            
            // Check if container exists
            const existing = await db.getContainerByExternalId(item.externalId);

            if (existing) {
              // Update existing container but preserve photo settings
              await db.updateContainer(existing.id, {
                name: item.name,
                size: item.size,
                condition: item.condition,
                price: item.price,
                isActive: true,
              });

              // Get existing photos to preserve their order settings
              const existingPhotos = await db.getPhotosByContainerId(existing.id);
              const existingPhotoUrls = new Set(existingPhotos.map(p => p.url));
              
              // Add only new photos (photos not already in DB)
              for (const url of item.photoUrls) {
                if (!existingPhotoUrls.has(url)) {
                  // Download and save image locally
                  const localUrl = await downloadAndSaveImage(url);
                  const maxOrder = existingPhotos.length > 0 
                    ? Math.max(...existingPhotos.map(p => p.displayOrder)) 
                    : 0;
                  await db.addContainerPhoto({
                    containerId: existing.id,
                    url: localUrl,
                    displayOrder: maxOrder + 1,
                    isMain: existingPhotos.length === 0, // Only set as main if no existing photos
                  });
                }
              }

              updated++;
            } else {
              // Create new container
              const newContainer = await db.createContainer({
                externalId: item.externalId,
                name: item.name,
                size: item.size,
                condition: item.condition,
                price: item.price,
                isActive: true,
              });

              if (newContainer) {
                // Add all photos
                for (let i = 0; i < item.photoUrls.length; i++) {
                  // Download and save image locally
                  const localUrl = await downloadAndSaveImage(item.photoUrls[i]);
                  await db.addContainerPhoto({
                    containerId: newContainer.id,
                    url: localUrl,
                    displayOrder: i + 1,
                    isMain: i === 0, // First photo is main by default
                  });
                }
              }

              added++;
            }
          }

          // Deactivate containers not in the new CSV
          await db.deactivateContainersNotIn(processedIds);

          // Update import record
          if (importId) {
            await db.updateImportRecord(importId, {
              status: "completed",
              containersProcessed: input.data.length,
              containersAdded: added,
              containersUpdated: updated,
              completedAt: new Date(),
            });
          }

          return {
            success: true,
            added,
            updated,
            total: input.data.length,
          };
        } catch (error) {
          // Update import record with error
          if (importId) {
            await db.updateImportRecord(importId, {
              status: "failed",
              errorMessage: error instanceof Error ? error.message : "Unknown error",
            });
          }
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Import failed" });
        }
      }),

    // Get import history
    getImportHistory: adminProcedure.query(async () => {
      return db.getImportHistory();
    }),
  }),

  // Setup route - create first admin user (only works if no admins exist)
  setup: router({
    createFirstAdmin: publicProcedure
      .input(z.object({
        username: z.string().min(3).max(64),
        password: z.string().min(6),
        name: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Check if any admin exists
        const existingAdmin = await db.getAdminUserByUsername("admin");
        if (existingAdmin) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Setup already completed" });
        }

        const newUser = await db.createAdminUser(input.username, input.password, input.name);
        if (!newUser) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create admin user" });
        }

        return {
          success: true,
          message: "Admin user created successfully",
        };
      }),

    // Check if setup is needed
    isSetupNeeded: publicProcedure.query(async () => {
      const existingAdmin = await db.getAdminUserByUsername("admin");
      return { setupNeeded: !existingAdmin };
    }),
  }),
});

export type AppRouter = typeof appRouter;
