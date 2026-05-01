import { TRPCError } from "@trpc/server";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";

import { publicProcedure, router } from "../_core/trpc";
import * as db from "../db";

const ADMIN_COOKIE_NAME = "admin_session";
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-key"
);

// Helper to create admin JWT token
async function createAdminToken(
  adminId: number,
  username: string
): Promise<string> {
  return new SignJWT({ adminId, username, type: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

// Helper to verify admin JWT token
async function verifyAdminToken(
  token: string
): Promise<{ adminId: number; username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.type !== "admin") {
      console.error("[Auth] Invalid token type:", payload.type);
      return null;
    }
    return {
      adminId: payload.adminId as number,
      username: payload.username as string,
    };
  } catch (err: any) {
    console.error("[Auth] JWT verification failed:", err.message);
    return null;
  }
}

// Admin procedure - checks admin authentication
export const adminProcedure = publicProcedure.use(async ({ ctx, next }) => {
  console.log("[Auth] Admin procedure check started");
  // Check cookie first, then Authorization header
  let token = ctx.req.cookies?.[ADMIN_COOKIE_NAME];
  if (!token) {
    const authHeader = ctx.req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
      console.log("[Auth] Token found in Authorization header");
    }
  } else {
    console.log("[Auth] Token found in cookies");
  }

  if (!token) {
    console.warn("[Auth] No token provided");
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Admin authentication required",
    });
  }

  const tokenData = await verifyAdminToken(token);
  if (!tokenData) {
    console.warn("[Auth] Token verification failed");
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid or expired admin session",
    });
  }

  try {
    const adminUser = await db.getAdminUserById(tokenData.adminId);
    if (!adminUser) {
      console.warn(
        "[Auth] Admin user not found in DB for ID:",
        tokenData.adminId
      );
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Admin user not found",
      });
    }

    console.log("[Auth] Admin authenticated successfully:", adminUser.username);
    return next({
      ctx: {
        ...ctx,
        adminUser,
      },
    });
  } catch (err: any) {
    console.error("[Auth] DB error during admin check:", err.message);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database error during authentication",
    });
  }
});

export const adminAuthRouter = router({
  // Login with username/password
  login: publicProcedure
    .input(
      z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      console.log("[Auth] Login attempt for username:", input.username);
      try {
        const adminUser = await db.verifyAdminPassword(
          input.username,
          input.password
        );

        if (!adminUser) {
          console.warn(
            "[Auth] Login failed: Invalid credentials for",
            input.username
          );
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid username or password",
          });
        }

        console.log("[Auth] Login successful for", input.username);
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
      } catch (err: any) {
        console.error("[Auth] Login error:", err.message);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database error during login",
        });
      }
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
      if (authHeader?.startsWith("Bearer ")) {
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
    .input(
      z.object({
        username: z.string().min(3).max(64),
        password: z.string().min(6),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const existing = await db.getAdminUserByUsername(input.username);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Username already exists",
        });
      }

      const newUser = await db.createAdminUser(
        input.username,
        input.password,
        input.name
      );
      if (!newUser) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user",
        });
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
    .input(
      z.object({
        newPassword: z.string().min(6),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const success = await db.updateAdminPassword(
        (ctx as any).adminUser.id,
        input.newPassword
      );
      return { success };
    }),
});
