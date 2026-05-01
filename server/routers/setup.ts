import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { publicProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const setupRouter = router({
  createFirstAdmin: publicProcedure
    .input(
      z.object({
        username: z.string().min(3).max(64),
        password: z.string().min(6),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Check if any admin exists
      const existingAdmin = await db.getAdminUserByUsername("admin");
      if (existingAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Setup already completed",
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
          message: "Failed to create admin user",
        });
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
});
