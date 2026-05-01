import "dotenv/config";

import axios from "axios";

import { TABLE_NAMES } from "../drizzle/schema";
import { execute } from "../server/db";

type CheckStatus = "PASS" | "WARN" | "FAIL";

interface CheckResult {
  status: CheckStatus;
  name: string;
  details: string;
}

interface DataLayerSyncStatus {
  isSyncing?: boolean;
  lastSyncAt?: string | null;
  byModule?: Record<
    string,
    {
      lastSync?: string | null;
      lastSuccess?: boolean | null;
      lastError?: string | null;
    }
  >;
}

interface ProcontainerRow {
  bitrixProductId?: number | string;
  containerNumber?: string;
  stockQuantity?: number | string;
  reserveEnd?: string | null;
}

interface ProcontainerPayload {
  stock?: ProcontainerRow[];
  reserved?: ProcontainerRow[];
  generatedAt?: string;
}

interface CatalogRow {
  bitrixProductId?: number | string;
  containerNumber?: string;
  serial?: boolean | string | number | null;
  photos?: string[];
}

interface CatalogPayload {
  containers?: CatalogRow[];
  generatedAt?: string;
}

function add(
  results: CheckResult[],
  status: CheckStatus,
  name: string,
  details: string
) {
  results.push({ status, name, details });
}

function normalizeId(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeBitrixProductId(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  return raw === "true" || raw === "1" || raw === "y" || raw === "yes";
}

function listDuplicates(values: string[]): string[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([value, count]) => value && count > 1)
    .map(([value]) => value)
    .sort((a, b) => a.localeCompare(b));
}

function difference(left: Set<string>, right: Set<string>): string[] {
  return [...left]
    .filter(value => !right.has(value))
    .sort((a, b) => a.localeCompare(b));
}

function intersection(left: Set<string>, right: Set<string>): string[] {
  return [...left]
    .filter(value => right.has(value))
    .sort((a, b) => a.localeCompare(b));
}

function asIsoAgeMinutes(isoValue: string | null | undefined): number | null {
  if (!isoValue) return null;
  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/.test(isoValue)
    ? isoValue
    : `${isoValue}Z`;
  const timestamp = Date.parse(normalized);
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await axios.get<T>(url, {
    timeout: 30_000,
    validateStatus: status => status >= 200 && status < 300,
  });
  return response.data;
}

async function hasColumn(
  tableName: string,
  columnName: string
): Promise<boolean> {
  const result = await execute(
    `SHOW COLUMNS FROM \`${tableName}\` LIKE '${columnName}'`
  );
  return (((result as any)?.[0] ?? []) as unknown[]).length > 0;
}

async function main() {
  const results: CheckResult[] = [];
  const asJson = process.argv.includes("--json");
  const baseUrl = (process.env.DATA_LAYER_API_BASE_URL ?? "")
    .trim()
    .replace(/\/+$/, "");

  let syncStatus: DataLayerSyncStatus | null = null;
  let procontainerPayload: ProcontainerPayload | null = null;
  let catalogPayload: CatalogPayload | null = null;

  if (!baseUrl) {
    add(
      results,
      "FAIL",
      "env.data_layer_base_url",
      "DATA_LAYER_API_BASE_URL is not configured"
    );
  } else {
    try {
      syncStatus = await fetchJson<DataLayerSyncStatus>(
        `${baseUrl}/api/sync/status`
      );
      const age = asIsoAgeMinutes(syncStatus.lastSyncAt);
      add(
        results,
        "PASS",
        "api.sync_status",
        age === null ? "reachable" : `reachable, last sync ${age} min ago`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      add(results, "FAIL", "api.sync_status", message);
    }

    try {
      procontainerPayload = await fetchJson<ProcontainerPayload>(
        `${baseUrl}/api/dashboard/procontainer`
      );
      const stockCount = Array.isArray(procontainerPayload.stock)
        ? procontainerPayload.stock.length
        : 0;
      const reservedCount = Array.isArray(procontainerPayload.reserved)
        ? procontainerPayload.reserved.length
        : 0;
      add(
        results,
        "PASS",
        "api.procontainer",
        `reachable, stock=${stockCount}, reserved=${reservedCount}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      add(results, "FAIL", "api.procontainer", message);
    }

    try {
      catalogPayload = await fetchJson<CatalogPayload>(
        `${baseUrl}/api/catalog/containers`
      );
      const count = Array.isArray(catalogPayload.containers)
        ? catalogPayload.containers.length
        : 0;
      add(results, "PASS", "api.catalog", `reachable, containers=${count}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      add(results, "FAIL", "api.catalog", message);
    }
  }

  const stockIds = new Set(
    (Array.isArray(procontainerPayload?.stock) ? procontainerPayload.stock : [])
      .map(row => normalizeId(row.containerNumber))
      .filter(Boolean)
  );
  const reservedIds = new Set(
    (Array.isArray(procontainerPayload?.reserved)
      ? procontainerPayload.reserved
      : []
    )
      .map(row => normalizeId(row.containerNumber))
      .filter(Boolean)
  );
  const dataLayerCatalogIds = new Set(
    (Array.isArray(catalogPayload?.containers) ? catalogPayload.containers : [])
      .map(row => normalizeId(row.containerNumber))
      .filter(Boolean)
  );
  const dataLayerNonSerialCatalogIds = new Set(
    (Array.isArray(catalogPayload?.containers) ? catalogPayload.containers : [])
      .filter(row => !normalizeBoolean(row.serial))
      .map(row => normalizeId(row.containerNumber))
      .filter(Boolean)
  );
  const dataLayerSerialCatalogIds = new Set(
    (Array.isArray(catalogPayload?.containers) ? catalogPayload.containers : [])
      .filter(row => normalizeBoolean(row.serial))
      .map(row => normalizeId(row.containerNumber))
      .filter(Boolean)
  );
  const stockBitrixIds = new Set(
    (Array.isArray(procontainerPayload?.stock) ? procontainerPayload.stock : [])
      .map(row => normalizeBitrixProductId(row.bitrixProductId))
      .filter((value): value is number => value !== undefined)
  );
  const dataLayerCatalogBitrixIds = new Set(
    (Array.isArray(catalogPayload?.containers) ? catalogPayload.containers : [])
      .map(row => normalizeBitrixProductId(row.bitrixProductId))
      .filter((value): value is number => value !== undefined)
  );
  const dataLayerNonSerialCatalogBitrixIds = new Set(
    (Array.isArray(catalogPayload?.containers) ? catalogPayload.containers : [])
      .filter(row => !normalizeBoolean(row.serial))
      .map(row => normalizeBitrixProductId(row.bitrixProductId))
      .filter((value): value is number => value !== undefined)
  );
  const dataLayerSerialCatalogBitrixIds = new Set(
    (Array.isArray(catalogPayload?.containers) ? catalogPayload.containers : [])
      .filter(row => normalizeBoolean(row.serial))
      .map(row => normalizeBitrixProductId(row.bitrixProductId))
      .filter((value): value is number => value !== undefined)
  );

  if (procontainerPayload) {
    const stockValues = (procontainerPayload.stock ?? [])
      .map(row => normalizeId(row.containerNumber))
      .filter(Boolean);
    const reservedValues = (procontainerPayload.reserved ?? [])
      .map(row => normalizeId(row.containerNumber))
      .filter(Boolean);

    const stockDuplicates = listDuplicates(stockValues);
    add(
      results,
      stockDuplicates.length === 0 ? "PASS" : "FAIL",
      "data_layer.stock_duplicates",
      stockDuplicates.length === 0 ? "0" : stockDuplicates.join(", ")
    );

    const reservedDuplicates = listDuplicates(reservedValues);
    add(
      results,
      reservedDuplicates.length === 0 ? "PASS" : "FAIL",
      "data_layer.reserved_duplicates",
      reservedDuplicates.length === 0 ? "0" : reservedDuplicates.join(", ")
    );

    const overlap = intersection(stockIds, reservedIds);
    add(
      results,
      overlap.length === 0 ? "PASS" : "FAIL",
      "data_layer.stock_reserved_overlap",
      overlap.length === 0 ? "0" : overlap.join(", ")
    );

    const invalidStockQty = (procontainerPayload.stock ?? []).filter(
      row => Number(row.stockQuantity ?? 0) <= 0
    ).length;
    add(
      results,
      invalidStockQty === 0 ? "PASS" : "FAIL",
      "data_layer.stock_quantity_positive",
      invalidStockQty === 0
        ? "0 invalid rows"
        : `${invalidStockQty} rows have non-positive stockQuantity`
    );

    const missingReserveEnd = (procontainerPayload.reserved ?? []).filter(
      row => !normalizeId(row.reserveEnd)
    ).length;
    add(
      results,
      missingReserveEnd === 0 ? "PASS" : "FAIL",
      "data_layer.reserved_end_present",
      missingReserveEnd === 0
        ? "0 invalid rows"
        : `${missingReserveEnd} reserved rows have empty reserveEnd`
    );

    const stockBitrixDuplicates = listDuplicates(
      (procontainerPayload.stock ?? [])
        .map(row => normalizeBitrixProductId(row.bitrixProductId))
        .filter((value): value is number => value !== undefined)
        .map(String)
    );
    add(
      results,
      stockBitrixDuplicates.length === 0 ? "PASS" : "FAIL",
      "data_layer.stock_bitrix_id_duplicates",
      stockBitrixDuplicates.length === 0
        ? "0"
        : stockBitrixDuplicates.join(", ")
    );
  }

  if (catalogPayload && procontainerPayload) {
    const onlyInCatalog = difference(dataLayerNonSerialCatalogIds, stockIds);
    const onlyInStock = difference(stockIds, dataLayerNonSerialCatalogIds);
    const serialOnlyInCatalog = difference(dataLayerSerialCatalogIds, stockIds);
    const mismatchCount = onlyInCatalog.length + onlyInStock.length;
    add(
      results,
      mismatchCount === 0 ? "PASS" : "FAIL",
      "data_layer.catalog_matches_stock",
      mismatchCount === 0
        ? `matched non-serial set (${stockIds.size}); serialOnlyInCatalog=${serialOnlyInCatalog.length}`
        : `onlyInNonSerialCatalog=${onlyInCatalog.length}, onlyInStock=${onlyInStock.length}, serialOnlyInCatalog=${serialOnlyInCatalog.length}; samples=${[...onlyInCatalog.slice(0, 3), ...onlyInStock.slice(0, 3)].join(", ")}`
    );

    const bitrixOnlyInCatalog = difference(
      new Set([...dataLayerNonSerialCatalogBitrixIds].map(String)),
      new Set([...stockBitrixIds].map(String))
    );
    const bitrixOnlyInStock = difference(
      new Set([...stockBitrixIds].map(String)),
      new Set([...dataLayerNonSerialCatalogBitrixIds].map(String))
    );
    const serialBitrixOnlyInCatalog = difference(
      new Set([...dataLayerSerialCatalogBitrixIds].map(String)),
      new Set([...stockBitrixIds].map(String))
    );
    const bitrixMismatchCount =
      bitrixOnlyInCatalog.length + bitrixOnlyInStock.length;
    add(
      results,
      bitrixMismatchCount === 0 ? "PASS" : "WARN",
      "data_layer.catalog_bitrix_ids_match_stock",
      bitrixMismatchCount === 0
        ? `matched non-serial set (${stockBitrixIds.size}); serialOnlyInCatalog=${serialBitrixOnlyInCatalog.length}`
        : `onlyInNonSerialCatalog=${bitrixOnlyInCatalog.length}, onlyInStock=${bitrixOnlyInStock.length}, serialOnlyInCatalog=${serialBitrixOnlyInCatalog.length}`
    );
  }

  try {
    const hasBitrixProductIdColumn = await hasColumn(
      TABLE_NAMES.containers,
      "bitrixProductId"
    );
    if (!hasBitrixProductIdColumn) {
      add(
        results,
        "WARN",
        "catalog.shadow_column",
        "containers.bitrixProductId column is not created yet"
      );
    }

    const activeContainersResult = await execute(
      hasBitrixProductIdColumn
        ? `SELECT \`id\`, \`externalId\`, \`bitrixProductId\`, \`name\`, \`size\`
           FROM \`${TABLE_NAMES.containers}\`
           WHERE \`isActive\` = 1
           ORDER BY \`id\` ASC`
        : `SELECT \`id\`, \`externalId\`, \`name\`, \`size\`
           FROM \`${TABLE_NAMES.containers}\`
           WHERE \`isActive\` = 1
           ORDER BY \`id\` ASC`
    );
    const activeContainers = ((activeContainersResult as any)?.[0] ??
      []) as Array<{
      id: number;
      externalId: string | null;
      bitrixProductId: number | null;
      name: string | null;
      size: string | null;
    }>;

    add(
      results,
      activeContainers.length > 0 ? "PASS" : "WARN",
      "catalog.active_count",
      `${activeContainers.length} active rows`
    );

    const activeExternalIds = activeContainers
      .map(row => normalizeId(row.externalId))
      .filter(Boolean);
    const duplicateExternalIds = listDuplicates(activeExternalIds);
    add(
      results,
      duplicateExternalIds.length === 0 ? "PASS" : "FAIL",
      "catalog.active_external_id_duplicates",
      duplicateExternalIds.length === 0 ? "0" : duplicateExternalIds.join(", ")
    );

    const invalidActiveRows = activeContainers.filter(
      row =>
        !normalizeId(row.externalId) ||
        !normalizeId(row.name) ||
        !normalizeId(row.size)
    );
    add(
      results,
      invalidActiveRows.length === 0 ? "PASS" : "FAIL",
      "catalog.active_required_fields",
      invalidActiveRows.length === 0
        ? "ok"
        : `${invalidActiveRows.length} active rows have blank externalId/name/size`
    );

    const activeBitrixIds = activeContainers
      .map((row: any) => normalizeBitrixProductId(row.bitrixProductId))
      .filter(
        (value: number | undefined): value is number => value !== undefined
      );
    if (hasBitrixProductIdColumn) {
      const duplicateBitrixIds = listDuplicates(activeBitrixIds.map(String));
      add(
        results,
        duplicateBitrixIds.length === 0 ? "PASS" : "FAIL",
        "catalog.active_bitrix_id_duplicates",
        duplicateBitrixIds.length === 0 ? "0" : duplicateBitrixIds.join(", ")
      );
    }

    if (catalogPayload) {
      const activeIdSet = new Set(activeExternalIds);
      const missingInCatalogDb = difference(dataLayerCatalogIds, activeIdSet);
      const extraInCatalogDb = difference(activeIdSet, dataLayerCatalogIds);
      const driftCount = missingInCatalogDb.length + extraInCatalogDb.length;
      add(
        results,
        driftCount === 0 ? "PASS" : "WARN",
        "catalog.active_vs_data_layer",
        driftCount === 0
          ? `matched set (${activeIdSet.size})`
          : `missingInCatalogDb=${missingInCatalogDb.length}, extraInCatalogDb=${extraInCatalogDb.length}; samples=${[...missingInCatalogDb.slice(0, 3), ...extraInCatalogDb.slice(0, 3)].join(", ")}`
      );

      if (hasBitrixProductIdColumn) {
        const activeBitrixIdSet = new Set(activeBitrixIds.map(String));
        const dataLayerBitrixIdSet = new Set(
          [...dataLayerCatalogBitrixIds].map(String)
        );
        const missingBitrixInCatalogDb = difference(
          dataLayerBitrixIdSet,
          activeBitrixIdSet
        );
        const extraBitrixInCatalogDb = difference(
          activeBitrixIdSet,
          dataLayerBitrixIdSet
        );
        const shadowDriftCount =
          missingBitrixInCatalogDb.length + extraBitrixInCatalogDb.length;
        add(
          results,
          shadowDriftCount === 0 ? "PASS" : "WARN",
          "catalog.shadow_bitrix_identity",
          shadowDriftCount === 0
            ? `matched set (${activeBitrixIdSet.size})`
            : `missingInCatalogDb=${missingBitrixInCatalogDb.length}, extraInCatalogDb=${extraBitrixInCatalogDb.length}`
        );
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    add(results, "FAIL", "catalog.active_query", message);
  }

  try {
    const settingsResult = await execute(
      `SELECT \`mode\` FROM \`${TABLE_NAMES.catalogSyncSettings}\` ORDER BY \`id\` ASC LIMIT 1`
    );
    const settingsRows = ((settingsResult as any)?.[0] ?? []) as Array<{
      mode: string | null;
    }>;
    if (settingsRows.length === 0) {
      add(
        results,
        "FAIL",
        "catalog.sync_settings",
        "catalog_sync_settings row missing"
      );
    } else {
      const mode = normalizeId(settingsRows[0].mode);
      const valid = mode === "AUTO" || mode === "MANUAL";
      add(
        results,
        valid ? "PASS" : "FAIL",
        "catalog.sync_settings",
        valid ? `mode=${mode}` : `invalid mode=${mode || "empty"}`
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    add(results, "FAIL", "catalog.sync_settings", message);
  }

  try {
    const orphanPhotosResult = await execute(
      `SELECT COUNT(*) AS \`cnt\`
       FROM \`${TABLE_NAMES.containerPhotos}\` p
       LEFT JOIN \`${TABLE_NAMES.containers}\` c ON c.\`id\` = p.\`containerId\`
       WHERE c.\`id\` IS NULL`
    );
    const orphanCount = Number(
      ((orphanPhotosResult as any)?.[0] ?? [])[0]?.cnt ?? 0
    );
    add(
      results,
      orphanCount === 0 ? "PASS" : "FAIL",
      "catalog.photo_orphans",
      String(orphanCount)
    );

    const multipleMainResult = await execute(
      `SELECT \`containerId\`, SUM(CASE WHEN \`isMain\` = 1 THEN 1 ELSE 0 END) AS \`mainCount\`
       FROM \`${TABLE_NAMES.containerPhotos}\`
       GROUP BY \`containerId\`
       HAVING SUM(CASE WHEN \`isMain\` = 1 THEN 1 ELSE 0 END) > 1`
    );
    const multipleMainRows = ((multipleMainResult as any)?.[0] ?? []) as Array<{
      containerId: number;
      mainCount: number;
    }>;
    add(
      results,
      multipleMainRows.length === 0 ? "PASS" : "FAIL",
      "catalog.photo_multiple_main",
      multipleMainRows.length === 0
        ? "0"
        : `${multipleMainRows.length} containers`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    add(results, "FAIL", "catalog.photo_integrity", message);
  }

  const payloadAges = [
    asIsoAgeMinutes(syncStatus?.lastSyncAt),
    asIsoAgeMinutes(procontainerPayload?.generatedAt),
    asIsoAgeMinutes(catalogPayload?.generatedAt),
  ].filter((value): value is number => value !== null);
  if (payloadAges.length > 0) {
    const oldestAge = Math.max(...payloadAges);
    add(
      results,
      oldestAge <= 180 ? "PASS" : "WARN",
      "freshness.integration_window",
      `oldest observed payload age ${oldestAge} min`
    );
  }

  const failCount = results.filter(result => result.status === "FAIL").length;
  const warnCount = results.filter(result => result.status === "WARN").length;
  const overall = failCount > 0 ? "FAIL" : warnCount > 0 ? "WARN" : "PASS";

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          overall,
          summary: {
            pass: results.filter(result => result.status === "PASS").length,
            warn: warnCount,
            fail: failCount,
          },
          results,
        },
        null,
        2
      )
    );
  } else {
    for (const result of results) {
      console.log(`[${result.status}] ${result.name}: ${result.details}`);
    }
    console.log(`\nOverall: ${overall}`);
  }

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(error => {
  const message =
    error instanceof Error ? error.stack || error.message : String(error);
  console.error(message);
  process.exit(1);
});
