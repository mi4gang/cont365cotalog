import { TRPCError } from "@trpc/server";
import * as cheerio from "cheerio";
import { z } from "zod";

import { router } from "../_core/trpc";
import { adminProcedure } from "./auth";
import {
  getCatalogWriteLockStatus,
  tryAcquireCatalogWriteLock,
} from "../catalogWriteLock";
import {
  getCatalogSyncMode,
  getCatalogSyncStatus,
  runCatalogSync,
  setCatalogSyncMode,
} from "../dataLayerSync";
import * as db from "../db";
import { downloadAndSaveImage } from "../localStorage";
import { ContainerPhoto } from "../../drizzle/schema";

// Parse import file (CSV or XLS/HTML)
async function parseImportFile(fileContent: string, filename: string) {
  console.log("[Import] ========== PARSE START ==========");
  console.log("[Import] Filename:", filename);
  console.log("[Import] Content length:", fileContent.length, "bytes");
  const isXls =
    filename.toLowerCase().endsWith(".xls") ||
    filename.toLowerCase().endsWith(".xlsx");

  console.log("[Import] File type:", isXls ? "XLS/HTML" : "CSV");

  if (isXls) {
    // Parse HTML table (XLS exported as HTML)
    const $ = cheerio.load(fileContent);
    const rows: any[] = [];
    console.log("[Import] Parsing XLS/HTML table...");

    // Column name mapping - normalize column names for flexible matching
    const normalizeColumnName = (name: string) => {
      return name
        .toLowerCase()
        .replace(/\s+/g, "") // Remove all spaces
        .replace(/[\/-]/g, "") // Remove slashes and dashes
        .trim();
    };

    // Expected column names with variations
    const columnPatterns: Record<string, string[]> = {
      product: ["товар", "название", "наименование", "id", "product", "name"],
      photos: [
        "картинки",
        "галерея",
        "фото",
        "картинкигалереи",
        "photos",
        "gallery",
        "images",
      ],
      price: ["цена", "розничнаяцена", "стоимость", "price", "retailprice"],
      size: ["тип", "типконтейнера", "размер", "type", "containertype", "size"],
      condition: [
        "класс",
        "состояние",
        "качество",
        "класссостояние",
        "condition",
        "quality",
        "класскачества",
      ],
      description: [
        "описание",
        "детальноеописание",
        "description",
        "detaileddescription",
      ],
      inventory: [
        "доступныйостаток",
        "остаток",
        "наличие",
        "доступность",
        "inventory",
        "stock",
        "available",
      ],
      terminal: [
        "локация",
        "терминал",
        "локациятерминал",
        "terminal",
        "location",
        "terminallocation",
      ],
    };

    // Read header row to determine column indices
    let columnIndices: Record<string, number> = {};
    console.log("[Import] Looking for columns...");

    $("table tr").each((i, row) => {
      if (i === 0) {
        // Parse header row
        const headerCells = $(row).find("td, th");
        headerCells.each((colIndex, cell) => {
          const headerText = normalizeColumnName($(cell).text());

          // Match header to column type
          for (const [key, patterns] of Object.entries(columnPatterns)) {
            if (
              patterns.some(
                pattern =>
                  headerText.includes(pattern) || pattern.includes(headerText)
              )
            ) {
              columnIndices[key] = colIndex;
              break;
            }
          }
        });
        console.log("[Import] Column indices found:", columnIndices);
        return; // Skip header row
      }

      const cells = $(row).find("td");
      if (cells.length === 0) return;

      // Extract data using column indices
      const productName =
        columnIndices.product !== undefined
          ? $(cells[columnIndices.product]).text().trim()
          : "";

      // Skip rows with HTML tags or empty product names
      if (
        !productName ||
        productName.startsWith("<") ||
        productName.includes("html") ||
        productName.includes("head") ||
        productName.includes("body") ||
        productName.includes("style")
      ) {
        return;
      }

      const photoUrls =
        columnIndices.photos !== undefined
          ? $(cells[columnIndices.photos])
              .text()
              .trim()
              .split(",")
              .map(url => url.trim())
              .filter(url => url.startsWith("http"))
          : [];

      const priceText =
        columnIndices.price !== undefined
          ? $(cells[columnIndices.price]).text().trim()
          : "";
      const sizeText =
        columnIndices.size !== undefined
          ? $(cells[columnIndices.size]).text().trim()
          : "";
      const conditionText =
        columnIndices.condition !== undefined
          ? $(cells[columnIndices.condition]).text().trim()
          : "";
      const description =
        columnIndices.description !== undefined
          ? $(cells[columnIndices.description]).text().trim()
          : "";
      const inventoryText =
        columnIndices.inventory !== undefined
          ? $(cells[columnIndices.inventory]).text().trim()
          : "";
      const terminalLocation =
        columnIndices.terminal !== undefined
          ? $(cells[columnIndices.terminal]).text().trim()
          : "";

      // Filter by inventory: if column exists, only import items with value > 0
      // If column doesn't exist, import all items (default behavior)
      if (columnIndices.inventory !== undefined) {
        const inventoryValue = parseInt(inventoryText) || 0;
        console.log(
          `[Import] Row ${i}: ${productName} - inventory=${inventoryValue}`
        );
        if (inventoryValue <= 0) {
          console.log(`[Import] SKIPPING (inventory <= 0): ${productName}`);
          return; // Skip this row - not available
        }
      }

      // Skip rows without product name
      if (!productName) return;

      // Parse price: remove &nbsp;, spaces, and ₽ symbol
      const price = priceText
        .replace(/&nbsp;|\s/g, "")
        .replace(/₽|&#8381;/g, "");

      // Map condition: "Новый" -> "new", "Б/У" -> "used"
      let condition: "new" | "used" = "used";
      if (
        conditionText.toLowerCase().includes("новый") ||
        conditionText.toLowerCase().includes("new")
      ) {
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
        terminalLocation: terminalLocation || undefined,
        photoUrls,
      });
    });

    console.log("[Import] ========== PARSE COMPLETE ==========");
    console.log("[Import] Total rows parsed:", rows.length);
    rows.forEach((row, idx) => {
      console.log(
        `[Import] Parsed row ${idx + 1}: ${row.externalId}, photos: ${row.photoUrls.length}`
      );
    });

    return rows;
  } else {
    // Parse CSV (legacy format)
    const lines = fileContent.split("\n").filter(line => line.trim());
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      // Skip header
      const parts = lines[i].split(";");
      if (parts.length < 6) continue;

      const externalId = parts[0].trim();
      const name = parts[1].trim();
      const photoUrls = parts[2]
        .split(",")
        .map(url => url.trim())
        .filter(url => url.startsWith("http"));
      const price = parts[3].trim().replace(/₽|\s/g, "");
      const size = parts[4].trim();
      const conditionText = parts[5].trim();

      let condition: "new" | "used" = "used";
      if (
        conditionText.toLowerCase().includes("новый") ||
        conditionText.toLowerCase().includes("new")
      ) {
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

export const adminContainersRouter = router({
  // Data Layer -> Catalog sync status
  getDataLayerSyncStatus: adminProcedure.query(async () => {
    return await getCatalogSyncStatus();
  }),

  getSyncMode: adminProcedure.query(async () => {
    return { mode: await getCatalogSyncMode() };
  }),

  setSyncMode: adminProcedure
    .input(z.object({ mode: z.enum(["AUTO", "MANUAL"]) }))
    .mutation(async ({ input }) => {
      const mode = await setCatalogSyncMode(input.mode);
      return { mode };
    }),

  // Manual Data Layer -> Catalog sync trigger
  syncFromDataLayer: adminProcedure.mutation(async () => {
    const result = await runCatalogSync("manual");
    if (!result.ok) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: result.error || "Data Layer sync failed",
      });
    }
    return result;
  }),

  // Get all containers (including inactive)
  list: adminProcedure.query(async () => {
    const containers = await db.getAllContainers(false);

    const containersWithPhotos = await Promise.all(
      containers.map(async container => {
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
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        size: z.string().optional(),
        condition: z.enum(["new", "used"]).optional(),
        price: z.string().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const success = await db.updateContainer(id, data);
      return { success };
    }),

  // Update photo order
  updatePhotoOrder: adminProcedure
    .input(
      z.object({
        photoId: z.number(),
        displayOrder: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const success = await db.updatePhotoOrder(
        input.photoId,
        input.displayOrder
      );
      return { success };
    }),

  // Set main photo
  setMainPhoto: adminProcedure
    .input(
      z.object({
        containerId: z.number(),
        photoId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const success = await db.setMainPhoto(input.containerId, input.photoId);
      return { success };
    }),

  // Reorder all photos for a container
  reorderPhotos: adminProcedure
    .input(
      z.object({
        containerId: z.number(),
        photoIds: z.array(z.number()),
      })
    )
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
  deleteAllContainers: adminProcedure.mutation(async () => {
    const success = await db.deleteAllContainers();
    return { success };
  }),

  // Import CSV/XLS
  importCsv: adminProcedure
    .input(
      z.object({
        fileContent: z.string(), // Raw file content (CSV or HTML)
        filename: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      console.log("[Import] ========== IMPORT MUTATION START ==========");
      console.log("[Import] Admin user:", (ctx as any).adminUser?.username);
      console.log("[Import] Filename:", input.filename);

      const adminUser = (ctx as any).adminUser;

      // Parse file content
      console.log("[Import] Calling parseImportFile...");
      const data = await parseImportFile(input.fileContent, input.filename);
      console.log("[Import] parseImportFile returned", data.length, "rows");

      const releaseLock = tryAcquireCatalogWriteLock("manual-import");
      if (!releaseLock) {
        const lockStatus = getCatalogWriteLockStatus();
        throw new TRPCError({
          code: "CONFLICT",
          message: `Каталог занят операцией: ${lockStatus.lockedBy ?? "unknown"}`,
        });
      }

      try {
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
          console.log(
            "[Import] Starting to process",
            data.length,
            "containers..."
          );

          for (const item of data) {
            console.log(`[Import] Processing: ${item.externalId}`);
            processedIds.push(item.externalId);

            // Check if container exists
            const existing = await db.getContainerByExternalId(item.externalId);
            console.log(`[Import] Container exists in DB: ${!!existing}`);

            if (existing) {
              console.log(
                `[Import] UPDATING existing container ID=${existing.id}`
              );
              // Update existing container but preserve photo settings
              await db.updateContainer(existing.id, {
                name: item.name,
                size: item.size,
                condition: item.condition,
                price: item.price,
                description: item.description,
                terminalLocation: item.terminalLocation,
                isActive: true,
              });

              // Smart photo update: preserve order for existing photos, add new ones to the end
              const existingPhotos = await db.getPhotosByContainerId(
                existing.id
              );
              const existingPhotoUrls = new Set(
                existingPhotos.map((p: ContainerPhoto) => p.url)
              );
              const importPhotoUrls = new Set<string>();

              // Find max displayOrder for existing photos
              const maxOrder =
                existingPhotos.length > 0
                  ? Math.max(
                      ...existingPhotos.map(
                        (p: ContainerPhoto) => p.displayOrder
                      )
                    )
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
              console.log(
                `[Import] CREATING new container: ${item.externalId}`
              );
              // Create new container
              const newContainer = await db.createContainer({
                externalId: item.externalId,
                name: item.name,
                size: item.size,
                condition: item.condition,
                price: item.price,
                description: item.description,
                terminalLocation: item.terminalLocation,
                isActive: true,
              });

              if (newContainer) {
                // Add all photos
                for (let i = 0; i < item.photoUrls.length; i++) {
                  // Download and save image locally
                  const localUrl = await downloadAndSaveImage(
                    item.photoUrls[i]
                  );
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

          console.log("[Import] Deactivating containers not in import...");
          console.log("[Import] Processed IDs:", processedIds);
          // Deactivate containers not in the new CSV
          await db.deactivateContainersNotIn(processedIds);
          console.log("[Import] Deactivation complete");

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

          console.log("[Import] ========== IMPORT SUCCESS ==========");
          console.log(
            `[Import] Added: ${added}, Updated: ${updated}, Total: ${data.length}`
          );

          return {
            success: true,
            added,
            updated,
            total: data.length,
          };
        } catch (error) {
          console.error("[Import] ========== IMPORT ERROR ==========");
          console.error("[Import] Error:", error);
          // Update import record with error
          if (importId) {
            await db.updateImportRecord(importId, {
              status: "failed",
              errorMessage:
                error instanceof Error ? error.message : "Unknown error",
            });
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Import failed",
          });
        }
      } finally {
        releaseLock();
      }
    }),

  // Get import history
  getImportHistory: adminProcedure.query(async () => {
    return db.getImportHistory();
  }),
});
