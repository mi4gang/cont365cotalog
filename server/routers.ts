import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { SignJWT, jwtVerify } from "jose";
import * as db from "./db";
import { ContainerPhoto } from "../drizzle/schema";
import { downloadAndSaveImage } from "./localStorage";
import * as cheerio from "cheerio";

// Parse import file (CSV or XLS/HTML)
async function parseImportFile(fileContent: string, filename: string) {
  console.log('[Import] ========== PARSE START ==========');
  console.log('[Import] Filename:', filename);
  console.log('[Import] Content length:', fileContent.length, 'bytes');
  const isXls = filename.toLowerCase().endsWith('.xls') || filename.toLowerCase().endsWith('.xlsx');
  
  console.log('[Import] File type:', isXls ? 'XLS/HTML' : 'CSV');
  
  if (isXls) {
    // Parse HTML table (XLS exported as HTML)
    const $ = cheerio.load(fileContent);
    const rows: any[] = [];
    console.log('[Import] Parsing XLS/HTML table...');
    
    // Column name mapping - normalize column names for flexible matching
    const normalizeColumnName = (name: string) => {
      return name.toLowerCase()
        .replace(/\s+/g, '') // Remove all spaces
        .replace(/[\/-]/g, '') // Remove slashes and dashes
        .trim();
    };
    
    // Expected column names with variations
    const columnPatterns: Record<string, string[]> = {
      product: ['товар', 'название', 'наименование', 'id', 'product', 'name'],
      photos: ['картинки', 'галерея', 'фото', 'картинкигалереи', 'photos', 'gallery', 'images'],
      price: ['цена', 'розничнаяцена', 'стоимость', 'price', 'retailprice'],
      size: ['тип', 'типконтейнера', 'размер', 'type', 'containertype', 'size'],
      condition: ['класс', 'состояние', 'качество', 'класссостояние', 'condition', 'quality', 'класскачества'],
      description: ['описание', 'детальноеописание', 'description', 'detaileddescription'],
      inventory: ['доступныйостаток', 'остаток', 'наличие', 'доступность', 'inventory', 'stock', 'available'],
    };
    
    // Read header row to determine column indices
    let columnIndices: Record<string, number> = {};
    console.log('[Import] Looking for columns...');
    
    $('table tr').each((i, row) => {
      if (i === 0) {
        // Parse header row
        const headerCells = $(row).find('td, th');
        headerCells.each((colIndex, cell) => {
          const headerText = normalizeColumnName($(cell).text());
          
          // Match header to column type
          for (const [key, patterns] of Object.entries(columnPatterns)) {
            if (patterns.some(pattern => headerText.includes(pattern) || pattern.includes(headerText))) {
              columnIndices[key] = colIndex;
              break;
            }
          }
        });
        console.log('[Import] Column indices found:', columnIndices);
        return; // Skip header row
      }
      
      const cells = $(row).find('td');
      if (cells.length === 0) return;
      
      // Extract data using column indices
      const productName = columnIndices.product !== undefined ? $(cells[columnIndices.product]).text().trim() : '';
      
      // Skip rows with HTML tags or empty product names
      if (!productName || productName.startsWith('<') || productName.includes('html') || productName.includes('head') || productName.includes('body') || productName.includes('style')) {
        return;
      }
      
      const photoUrls = columnIndices.photos !== undefined
        ? $(cells[columnIndices.photos]).text().trim()
            .split(',')
            .map(url => url.trim())
            .filter(url => url.startsWith('http'))
        : [];
      
      const priceText = columnIndices.price !== undefined ? $(cells[columnIndices.price]).text().trim() : '';
      const sizeText = columnIndices.size !== undefined ? $(cells[columnIndices.size]).text().trim() : '';
      const conditionText = columnIndices.condition !== undefined ? $(cells[columnIndices.condition]).text().trim() : '';
      const description = columnIndices.description !== undefined ? $(cells[columnIndices.description]).text().trim() : '';
      const inventoryText = columnIndices.inventory !== undefined ? $(cells[columnIndices.inventory]).text().trim() : '';
      
      // Filter by inventory: if column exists, only import items with value = 1
      // If column doesn't exist, import all items (default behavior)
      if (columnIndices.inventory !== undefined) {
        const inventoryValue = parseInt(inventoryText) || 0;
        console.log(`[Import] Row ${i}: ${productName} - inventory=${inventoryValue}`);
        if (inventoryValue !== 1) {
          console.log(`[Import] SKIPPING (inventory != 1): ${productName}`);
          return; // Skip this row - not available
        }
      }
      
      // Skip rows without product name
      if (!productName) return;
      
      // Parse price: remove &nbsp;, spaces, and ₽ symbol
      const price = priceText.replace(/&nbsp;|\s/g, '').replace(/₽|&#8381;/g, '');
      
      // Map condition: "Новый" -> "new", "Б/У" -> "used"
      let condition: "new" | "used" = "used";
      if (conditionText.toLowerCase().includes('новый') || conditionText.toLowerCase().includes('new')) {
        condition = "new";
      }
      
      // Size: extract from "Тип контейнера" or use default
      const size = sizeText || "20 фут";
      
      rows.push({
        externalId: productName, // Product name is both ID and name
        name: productName,
        size,
        condition,
        price: price || undefined,
        description: description || undefined,
        photoUrls,
      });
    });
    
    console.log('[Import] ========== PARSE COMPLETE ==========');
    console.log('[Import] Total rows parsed:', rows.length);
    rows.forEach((row, idx) => {
      console.log(`[Import] Parsed row ${idx + 1}: ${row.externalId}, photos: ${row.photoUrls.length}`);
    });
    
    return rows;
  } else {
    // Parse CSV (legacy format)
    const lines = fileContent.split('\n').filter(line => line.trim());
    const rows: any[] = [];
    
    for (let i = 1; i < lines.length; i++) { // Skip header
      const parts = lines[i].split(';');
      if (parts.length < 6) continue;
      
      const externalId = parts[0].trim();
      const name = parts[1].trim();
      const photoUrls = parts[2].split(',').map(url => url.trim()).filter(url => url.startsWith('http'));
      const price = parts[3].trim().replace(/₽|\s/g, '');
      const size = parts[4].trim();
      const conditionText = parts[5].trim();
      
      let condition: "new" | "used" = "used";
      if (conditionText.toLowerCase().includes('новый') || conditionText.toLowerCase().includes('new')) {
        condition = "new";
      }
      
      rows.push({
        externalId,
        name,
        size,
        condition,
        price: price || undefined,
        photoUrls,
      });
    }
    
    return rows;
  }
}

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
        priceFrom: z.number().optional(),
        priceTo: z.number().optional(),
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
        if (input?.priceFrom !== undefined) {
          containers = containers.filter(c => parseFloat(c.price || "0") >= input.priceFrom!);
        }
        if (input?.priceTo !== undefined) {
          containers = containers.filter(c => parseFloat(c.price || "0") <= input.priceTo!);
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

    // Delete container
    deleteContainer: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const success = await db.deleteContainer(input.id);
        return { success };
      }),

    // Delete all containers
    deleteAllContainers: adminProcedure
      .mutation(async () => {
        const success = await db.deleteAllContainers();
        return { success };
      }),

    // Import CSV/XLS
    importCsv: adminProcedure
      .input(z.object({
        fileContent: z.string(), // Raw file content (CSV or HTML)
        filename: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        console.log('[Import] ========== IMPORT MUTATION START ==========');
        console.log('[Import] Admin user:', (ctx as any).adminUser?.username);
        console.log('[Import] Filename:', input.filename);
        
        const adminUser = (ctx as any).adminUser;
        
        // Parse file content
        console.log('[Import] Calling parseImportFile...');
        const data = await parseImportFile(input.fileContent, input.filename);
        console.log('[Import] parseImportFile returned', data.length, 'rows');
        
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
          console.log('[Import] Starting to process', data.length, 'containers...');
          
          for (const item of data) {
            console.log(`[Import] Processing: ${item.externalId}`);
            processedIds.push(item.externalId);
            
            // Check if container exists
            const existing = await db.getContainerByExternalId(item.externalId);
            console.log(`[Import] Container exists in DB: ${!!existing}`);

            if (existing) {
              console.log(`[Import] UPDATING existing container ID=${existing.id}`);
              // Update existing container but preserve photo settings
              await db.updateContainer(existing.id, {
                name: item.name,
                size: item.size,
                condition: item.condition,
                price: item.price,
                description: item.description,
                isActive: true,
              });

              // Smart photo update: preserve order for existing photos, add new ones to the end
              const existingPhotos = await db.getPhotosByContainerId(existing.id);
              const existingPhotoUrls = new Set(existingPhotos.map((p: ContainerPhoto) => p.url));
              const importPhotoUrls = new Set<string>();
              
              // Find max displayOrder for existing photos
              const maxOrder = existingPhotos.length > 0 
                ? Math.max(...existingPhotos.map((p: ContainerPhoto) => p.displayOrder))
                : 0;
              
              // Process photos from import
              for (let i = 0; i < item.photoUrls.length; i++) {
                const localUrl = await downloadAndSaveImage(item.photoUrls[i]);
                importPhotoUrls.add(localUrl);
                
                // If photo already exists, keep its order and isMain setting
                if (!existingPhotoUrls.has(localUrl)) {
                  // New photo: add to the end
                  await db.addContainerPhoto({
                    containerId: existing.id,
                    url: localUrl,
                    displayOrder: maxOrder + i + 1,
                    isMain: false, // New photos are not main by default
                  });
                }
                // If photo exists, do nothing (preserve existing displayOrder and isMain)
              }
              
              // Remove photos that are not in the import
              for (const existingPhoto of existingPhotos) {
                if (!importPhotoUrls.has(existingPhoto.url)) {
                  await db.deletePhoto(existingPhoto.id);
                }
              }

              updated++;
              console.log(`[Import] Updated container: ${item.externalId}`);
            } else {
              console.log(`[Import] CREATING new container: ${item.externalId}`);
              // Create new container
              const newContainer = await db.createContainer({
                externalId: item.externalId,
                name: item.name,
                size: item.size,
                condition: item.condition,
                price: item.price,
                description: item.description,
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
              console.log(`[Import] Created new container: ${item.externalId}`);
            }
          }

          console.log('[Import] Deactivating containers not in import...');
          console.log('[Import] Processed IDs:', processedIds);
          // Deactivate containers not in the new CSV
          await db.deactivateContainersNotIn(processedIds);
          console.log('[Import] Deactivation complete');

          // Update import record
          if (importId) {
            await db.updateImportRecord(importId, {
              status: "completed",
              containersProcessed: data.length,
              containersAdded: added,
              containersUpdated: updated,
              completedAt: new Date(),
            });
          }

          console.log('[Import] ========== IMPORT SUCCESS ==========');
          console.log(`[Import] Added: ${added}, Updated: ${updated}, Total: ${data.length}`);
          
          return {
            success: true,
            added,
            updated,
            total: data.length,
          };
        } catch (error) {
          console.error('[Import] ========== IMPORT ERROR ==========');
          console.error('[Import] Error:', error);
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
