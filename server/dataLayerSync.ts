import axios from "axios";
import * as db from "./db";
import { getCatalogWriteLockStatus, tryAcquireCatalogWriteLock } from "./catalogWriteLock";

type SyncSource = "manual" | "auto-startup" | "auto-hourly";
type SyncMode = "AUTO" | "MANUAL";

interface DataLayerCatalogItem {
  containerNumber?: string;
  name?: string;
  terminal?: string;
  price?: number | string;
  containerType?: string | null;
  condition?: string | null;
  description?: string | null;
  serial?: boolean | string | number | null;
  photos?: string[];
  isActive?: boolean;
}

interface DataLayerPayload {
  containers?: DataLayerCatalogItem[];
  generatedAt?: string;
  sync?: {
    lastSyncAt?: string | null;
    isSyncing?: boolean;
  };
}

interface DataLayerProcontainerPayload {
  stock?: Array<{
    containerNumber?: string;
    terminal?: string;
    recommendedPrice?: number | string;
  }>;
}

interface CatalogSyncState {
  isRunning: boolean;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastAutoRunAt: string | null;
  lastSuccess: boolean | null;
  lastError: string | null;
  lastSource: SyncSource | null;
  lastAdded: number;
  lastUpdated: number;
  lastDeactivated: number;
  lastTotal: number;
  nextAutoRunAt: string | null;
  lastDataLayerEndpoint: string | null;
  lastDataLayerGeneratedAt: string | null;
  lastDataLayerSyncAt: string | null;
}

const state: CatalogSyncState = {
  isRunning: false,
  lastStartedAt: null,
  lastFinishedAt: null,
  lastAutoRunAt: null,
  lastSuccess: null,
  lastError: null,
  lastSource: null,
  lastAdded: 0,
  lastUpdated: 0,
  lastDeactivated: 0,
  lastTotal: 0,
  nextAutoRunAt: null,
  lastDataLayerEndpoint: null,
  lastDataLayerGeneratedAt: null,
  lastDataLayerSyncAt: null,
};

const AUTO_SYNC_ENABLED = (process.env.CATALOG_AUTO_SYNC_ENABLED ?? "true").toLowerCase() === "true";
const AUTO_SYNC_INTERVAL_MINUTES = Math.max(1, Number(process.env.CATALOG_AUTO_SYNC_INTERVAL_MINUTES ?? 60));
const AUTO_SYNC_RUN_ON_START = (process.env.CATALOG_AUTO_SYNC_RUN_ON_START ?? "false").toLowerCase() === "true";
const DATA_LAYER_API_BASE_URL = (process.env.DATA_LAYER_API_BASE_URL ?? "").trim().replace(/\/+$/, "");
function envNumber(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const DATA_LAYER_FETCH_TIMEOUT_MS = Math.max(5_000, envNumber("CATALOG_DATA_LAYER_FETCH_TIMEOUT_MS", 45_000));
const MIN_SAFE_CATALOG_ROWS = Math.max(1, envNumber("CATALOG_MIN_SAFE_ROWS", 1));

let currentRun: Promise<CatalogSyncResult> | null = null;
let intervalHandle: NodeJS.Timeout | null = null;

export interface CatalogSyncResult {
  ok: boolean;
  source: SyncSource;
  added: number;
  updated: number;
  deactivated: number;
  total: number;
  dataLayerEndpoint?: string | null;
  dataLayerGeneratedAt?: string | null;
  dataLayerSyncAt?: string | null;
  error?: string;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = Number(value.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function normalizeExternalId(raw: unknown): string {
  return String(raw ?? "").trim();
}

function normalizeSize(value: unknown): string {
  const raw = String(value ?? "").trim();
  return raw || "20 фут";
}

function normalizeCondition(value: unknown): "new" | "used" {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "used";
  if (raw === "new" || raw.includes("нов")) return "new";
  return "used";
}

function normalizePhotoUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter((url) => /^https?:\/\//i.test(url));
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const raw = String(value ?? "").trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "y" || raw === "yes";
}

function dedupeCatalogRows(items: DataLayerCatalogItem[]): DataLayerCatalogItem[] {
  const byExternalId = new Map<string, DataLayerCatalogItem>();
  for (const item of items) {
    const externalId = normalizeExternalId(item.containerNumber);
    if (!externalId) continue;
    byExternalId.set(externalId, item);
  }
  return Array.from(byExternalId.values());
}

function isMissingCatalogEndpoint(error: unknown): boolean {
  return axios.isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 405);
}

function formatDataLayerError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ? `HTTP ${error.response.status}` : error.code;
    return [status, error.message].filter(Boolean).join(": ");
  }
  return error instanceof Error ? error.message : "Unknown Data Layer error";
}

async function fetchCatalogPayloadFromDataLayer(): Promise<{
  items: DataLayerCatalogItem[];
  endpoint: string;
  generatedAt: string | null;
  upstreamSyncAt: string | null;
}> {
  if (!DATA_LAYER_API_BASE_URL) {
    throw new Error("DATA_LAYER_API_BASE_URL is not configured");
  }

  const preferredUrl = `${DATA_LAYER_API_BASE_URL}/api/catalog/containers`;
  try {
    const response = await axios.get<DataLayerPayload>(preferredUrl, {
      timeout: DATA_LAYER_FETCH_TIMEOUT_MS,
      validateStatus: (status) => status >= 200 && status < 300,
    });
    const items = Array.isArray(response.data?.containers) ? response.data.containers : [];
    return {
      items: dedupeCatalogRows(items),
      endpoint: preferredUrl,
      generatedAt: response.data?.generatedAt ?? null,
      upstreamSyncAt: response.data?.sync?.lastSyncAt ?? null,
    };
  } catch (error) {
    if (isMissingCatalogEndpoint(error)) {
      const fallbackUrl = `${DATA_LAYER_API_BASE_URL}/api/dashboard/procontainer`;
      const fallbackResponse = await axios.get<DataLayerProcontainerPayload>(fallbackUrl, {
        timeout: DATA_LAYER_FETCH_TIMEOUT_MS,
        validateStatus: (status) => status >= 200 && status < 300,
      });
      const fallbackItems = (Array.isArray(fallbackResponse.data?.stock) ? fallbackResponse.data.stock : [])
        .map((row) => ({
          containerNumber: row.containerNumber,
          name: row.containerNumber,
          terminal: row.terminal,
          price: row.recommendedPrice,
          photos: undefined,
          serial: false,
          isActive: true,
        }));
      return {
        items: dedupeCatalogRows(fallbackItems),
        endpoint: fallbackUrl,
        generatedAt: null,
        upstreamSyncAt: null,
      };
    }
    throw new Error(`Data Layer catalog snapshot unavailable: ${formatDataLayerError(error)}`);
  }
}

async function replaceContainerPhotos(containerId: number, photoUrls: string[]): Promise<void> {
  const existingPhotos = await db.getPhotosByContainerId(containerId);
  for (const photo of existingPhotos) {
    await db.deletePhoto(photo.id);
  }

  for (let i = 0; i < photoUrls.length; i += 1) {
    await db.addContainerPhoto({
      containerId,
      url: photoUrls[i],
      displayOrder: i + 1,
      isMain: i === 0,
    });
  }
}

async function runSyncInternal(source: SyncSource): Promise<CatalogSyncResult> {
  const releaseLock = tryAcquireCatalogWriteLock("data-layer-sync");
  if (!releaseLock) {
    const lockStatus = getCatalogWriteLockStatus();
    return {
      ok: false,
      source,
      added: 0,
      updated: 0,
      deactivated: 0,
      total: 0,
      error: `Catalog is busy: ${lockStatus.lockedBy ?? "unknown"}`,
    };
  }

  state.isRunning = true;
  state.lastStartedAt = new Date().toISOString();
  state.lastFinishedAt = null;
  state.lastError = null;
  state.lastSource = source;
  if (source === "auto-startup" || source === "auto-hourly") {
    state.lastAutoRunAt = state.lastStartedAt;
  }

  let added = 0;
  let updated = 0;
  let deactivated = 0;
  let total = 0;

  try {
    const {
      items: catalogRows,
      endpoint: dataLayerEndpoint,
      generatedAt: dataLayerGeneratedAt,
      upstreamSyncAt,
    } = await fetchCatalogPayloadFromDataLayer();
    total = catalogRows.length;

    if (total < MIN_SAFE_CATALOG_ROWS) {
      throw new Error(
        `Data Layer catalog snapshot is suspiciously small (${total} rows); catalog was not changed`,
      );
    }

    const processedExternalIds: string[] = [];

    for (const row of catalogRows) {
      const externalId = normalizeExternalId(row.containerNumber);
      if (!externalId) continue;

      processedExternalIds.push(externalId);
      const photos = normalizePhotoUrls(row.photos);
      const hasPhotoPayload = Array.isArray(row.photos);
      const payload = {
        externalId,
        name: String(row.name ?? externalId).trim() || externalId,
        size: normalizeSize(row.containerType),
        condition: normalizeCondition(row.condition),
        price: toNumber(row.price) > 0 ? String(toNumber(row.price)) : undefined,
        description: String(row.description ?? "").trim() || undefined,
        terminalLocation: String(row.terminal ?? "").trim() || undefined,
        serial: toBoolean(row.serial),
        isActive: row.isActive !== false,
      } as const;

      const existing = await db.getContainerByExternalId(externalId);
      if (existing) {
        // AUTO policy: overwrite all sync fields.
        await db.updateContainer(existing.id, payload);
        if (hasPhotoPayload) {
          await replaceContainerPhotos(existing.id, photos);
        }
        updated += 1;
      } else {
        const created = await db.createContainer(payload);
        if (created) {
          if (hasPhotoPayload) {
            await replaceContainerPhotos(created.id, photos);
          }
        }
        added += 1;
      }
    }

    deactivated = await db.deactivateContainersNotIn(processedExternalIds);

    state.lastFinishedAt = new Date().toISOString();
    state.lastSuccess = true;
    state.lastAdded = added;
    state.lastUpdated = updated;
    state.lastDeactivated = deactivated;
    state.lastTotal = total;
    state.lastDataLayerEndpoint = dataLayerEndpoint;
    state.lastDataLayerGeneratedAt = dataLayerGeneratedAt;
    state.lastDataLayerSyncAt = upstreamSyncAt;

    return {
      ok: true,
      source,
      added,
      updated,
      deactivated,
      total,
      dataLayerEndpoint,
      dataLayerGeneratedAt,
      dataLayerSyncAt: upstreamSyncAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    state.lastFinishedAt = new Date().toISOString();
    state.lastSuccess = false;
    state.lastError = message;
    state.lastAdded = added;
    state.lastUpdated = updated;
    state.lastDeactivated = deactivated;
    state.lastTotal = total;

    return {
      ok: false,
      source,
      added,
      updated,
      deactivated,
      total,
      error: message,
    };
  } finally {
    state.isRunning = false;
    releaseLock();
  }
}

export async function getCatalogSyncStatus() {
  const lock = getCatalogWriteLockStatus();
  const mode = await db.getCatalogSyncMode();
  const autoEnabled = AUTO_SYNC_ENABLED && mode === "AUTO";
  const nextAutoRunAt = autoEnabled ? state.nextAutoRunAt : null;
  const nextAutoInSeconds =
    nextAutoRunAt ? Math.max(0, Math.floor((new Date(nextAutoRunAt).getTime() - Date.now()) / 1000)) : null;
  return {
    ...state,
    lock,
    auto: {
      mode,
      enabled: autoEnabled,
      intervalMinutes: AUTO_SYNC_INTERVAL_MINUTES,
      runOnStart: AUTO_SYNC_RUN_ON_START,
      dataLayerBaseUrl: DATA_LAYER_API_BASE_URL || null,
      nextRunAt: nextAutoRunAt,
      nextRunInSeconds: nextAutoInSeconds,
    },
  };
}

export async function getCatalogSyncMode(): Promise<SyncMode> {
  return db.getCatalogSyncMode();
}

export async function setCatalogSyncMode(mode: SyncMode): Promise<SyncMode> {
  return db.setCatalogSyncMode(mode);
}

export async function runCatalogSync(source: SyncSource = "manual"): Promise<CatalogSyncResult> {
  if (currentRun) return currentRun;
  currentRun = runSyncInternal(source).finally(() => {
    currentRun = null;
  });
  return currentRun;
}

async function canRunAutoSyncNow(): Promise<boolean> {
  if (!AUTO_SYNC_ENABLED) {
    return false;
  }
  if (!DATA_LAYER_API_BASE_URL) {
    console.warn("[catalog-sync] DATA_LAYER_API_BASE_URL is empty; auto sync skipped");
    return false;
  }
  const mode = await db.getCatalogSyncMode();
  return mode === "AUTO";
}

export function startCatalogAutoSyncScheduler() {
  if (!AUTO_SYNC_ENABLED) {
    console.log("[catalog-sync] Auto scheduler disabled by env");
    return;
  }
  if (intervalHandle) return;

  const runAutoTick = (source: SyncSource) => {
    state.nextAutoRunAt = new Date(Date.now() + AUTO_SYNC_INTERVAL_MINUTES * 60_000).toISOString();
    canRunAutoSyncNow()
      .then((allowed) => {
        if (!allowed) {
          console.log(`[catalog-sync] ${source} skipped (mode MANUAL or missing config)`);
          return;
        }
        return runCatalogSync(source).then((result) => {
          if (!result) return;
          if (!result.ok) {
            console.error(`[catalog-sync] ${source} failed:`, result.error);
          } else {
            console.log(
              `[catalog-sync] ${source} done: total=${result.total}, added=${result.added}, updated=${result.updated}, deactivated=${result.deactivated}`,
            );
          }
        });
      })
      .catch((err) => {
        console.error(`[catalog-sync] ${source} check failed:`, err);
      });
  };

  if (AUTO_SYNC_RUN_ON_START) {
    runAutoTick("auto-startup");
  }

  const intervalMs = AUTO_SYNC_INTERVAL_MINUTES * 60_000;
  state.nextAutoRunAt = new Date(Date.now() + intervalMs).toISOString();
  intervalHandle = setInterval(() => runAutoTick("auto-hourly"), intervalMs);

  console.log(
    `[catalog-sync] Auto scheduler started (interval=${AUTO_SYNC_INTERVAL_MINUTES} min, runOnStart=${AUTO_SYNC_RUN_ON_START})`,
  );
}
