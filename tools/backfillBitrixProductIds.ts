import "dotenv/config";

import axios from "axios";

import { TABLE_NAMES } from "../drizzle/schema";
import { execute } from "../server/db";

interface DataLayerCatalogRow {
  bitrixProductId?: number | string;
  containerNumber?: string;
}

interface DataLayerCatalogPayload {
  containers?: DataLayerCatalogRow[];
}

function normalizeExternalId(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeBitrixProductId(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
}

async function hasColumn(tableName: string, columnName: string): Promise<boolean> {
  const result = await execute(`SHOW COLUMNS FROM \`${tableName}\` LIKE '${columnName}'`);
  return (((result as any)?.[0] ?? []) as unknown[]).length > 0;
}

async function main() {
  const write = process.argv.includes("--write");
  const baseUrl = (process.env.DATA_LAYER_API_BASE_URL ?? "").trim().replace(/\/+$/, "");
  if (!baseUrl) {
    throw new Error("DATA_LAYER_API_BASE_URL is not configured");
  }

  const hasBitrixProductIdColumn = await hasColumn(TABLE_NAMES.containers, "bitrixProductId");
  if (!hasBitrixProductIdColumn) {
    console.log(
      JSON.stringify(
        {
          mode: write ? "write" : "dry-run",
          skipped: true,
          reason: "containers.bitrixProductId column is not created yet",
        },
        null,
        2,
      ),
    );
    return;
  }

  const response = await axios.get<DataLayerCatalogPayload>(`${baseUrl}/api/catalog/containers`, {
    timeout: 30_000,
    validateStatus: (status) => status >= 200 && status < 300,
  });

  const rows = Array.isArray(response.data?.containers) ? response.data.containers : [];
  const byExternalId = new Map<string, number>();
  for (const row of rows) {
    const externalId = normalizeExternalId(row.containerNumber);
    const bitrixProductId = normalizeBitrixProductId(row.bitrixProductId);
    if (!externalId || bitrixProductId === undefined) continue;
    byExternalId.set(externalId, bitrixProductId);
  }

  const containersResult = await execute(
    `SELECT \`id\`, \`externalId\`, \`bitrixProductId\`
     FROM \`${TABLE_NAMES.containers}\`
     WHERE \`isActive\` = 1
     ORDER BY \`id\` ASC`,
  );
  const containers = ((containersResult as any)?.[0] ?? []) as Array<{
    id: number;
    externalId: string | null;
    bitrixProductId: number | null;
  }>;

  const updates = containers
    .map((container) => {
      const externalId = normalizeExternalId(container.externalId);
      const nextBitrixProductId = byExternalId.get(externalId);
      if (!externalId || nextBitrixProductId === undefined) return null;
      if (container.bitrixProductId === nextBitrixProductId) return null;
      return {
        id: container.id,
        externalId,
        previousBitrixProductId: container.bitrixProductId,
        nextBitrixProductId,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (!write) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          totalActiveContainers: containers.length,
          mappableRows: updates.length,
          sample: updates.slice(0, 10),
        },
        null,
        2,
      ),
    );
    return;
  }

  for (const update of updates) {
    await execute(
      `UPDATE \`${TABLE_NAMES.containers}\`
       SET \`bitrixProductId\` = ?
       WHERE \`id\` = ?`,
      [update.nextBitrixProductId, update.id],
    );
  }

  console.log(
    JSON.stringify(
      {
        mode: "write",
        updated: updates.length,
        sample: updates.slice(0, 10),
      },
      null,
      2,
    ),
  );
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    console.error(message);
    process.exit(1);
  });
