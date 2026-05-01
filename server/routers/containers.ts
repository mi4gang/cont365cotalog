import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { publicProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { normalizeContainerDisplayName } from "../../shared/containerNaming";

export const containersRouter = router({
  // Get all active containers for catalog
  list: publicProcedure
    .input(
      z
        .object({
          sizes: z.array(z.string()).optional(),
          condition: z.enum(["new", "used"]).optional(),
          terminals: z.array(z.string()).optional(),
          search: z.string().optional(),
          priceFrom: z.number().optional(),
          priceTo: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      let containers = await db.getAllContainers(true);

      // Apply filters
      if (input?.sizes && input.sizes.length > 0) {
        containers = containers.filter(c =>
          input.sizes!.some(size =>
            c.size.toLowerCase().includes(size.toLowerCase())
          )
        );
      }
      if (input?.condition) {
        containers = containers.filter(c => c.condition === input.condition);
      }
      if (input?.terminals && input.terminals.length > 0) {
        containers = containers.filter(c =>
          input.terminals!.includes(c.terminalLocation || "")
        );
      }
      if (input?.search) {
        const searchLower = input.search.toLowerCase();
        containers = containers.filter(
          c =>
            c.name.toLowerCase().includes(searchLower) ||
            c.externalId.toLowerCase().includes(searchLower)
        );
      }
      if (input?.priceFrom !== undefined) {
        containers = containers.filter(
          c => parseFloat(c.price || "0") >= input.priceFrom!
        );
      }
      if (input?.priceTo !== undefined) {
        containers = containers.filter(
          c => parseFloat(c.price || "0") <= input.priceTo!
        );
      }

      // Get main photo for each container
      const containersWithPhotos = [];

      for (const container of containers) {
        const mainPhoto = await db.getMainPhotoByContainerId(container.id);
        containersWithPhotos.push({
          ...container,
          name: normalizeContainerDisplayName(
            container.name,
            container.size,
            container.serial
          ),
          mainPhoto: mainPhoto?.url || null,
        });
      }

      return containersWithPhotos;
    }),

  // Get single container with all photos
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const container = await db.getContainerById(input.id);
      if (!container) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Container not found",
        });
      }

      const photos = await db.getPhotosByContainerId(container.id);

      return {
        ...container,
        name: normalizeContainerDisplayName(
          container.name,
          container.size,
          container.serial
        ),
        photos,
      };
    }),

  getPublicById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const container = await db.getContainerById(input.id);
      if (!container || !container.isActive) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Container not found",
        });
      }

      const photos = await db.getPhotosByContainerId(container.id);

      return {
        ...container,
        name: normalizeContainerDisplayName(
          container.name,
          container.size,
          container.serial
        ),
        photos,
      };
    }),

  // Get unique sizes for filter dropdown
  getSizes: publicProcedure.query(async () => {
    const containers = await db.getAllContainers(true);
    const sizes = Array.from(new Set(containers.map(c => c.size)));
    return sizes.sort();
  }),

  // Get unique terminals for filter dropdown
  getTerminals: publicProcedure.query(async () => {
    const containers = await db.getAllContainers(true);
    const terminals = Array.from(
      new Set(
        containers
          .map(c => c.terminalLocation)
          .filter(
            (t): t is string => t !== null && t !== undefined && t.trim() !== ""
          )
      )
    );
    return terminals.sort();
  }),
});
