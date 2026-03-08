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
  photos?: string[];
  isActive?: boolean;
}

interface DataLayerPayload {
  containers?: DataLayerCatalogItem[];
  generatedAt?: string;
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
};

const AUTO_SYNC_ENABLED = (process.env.CATALOG_AUTO_SYNC_ENABLED ?? "true").toLowerCase() === "true";
const AUTO_SYNC_INTERVAL_MINUTES = Math.max(1, Number(process.env.CATALOG_AUTO_SYNC_INTERVAL_MINUTES ?? 60));
const AUTO_SYNC_RUN_ON_START = (process.env.CATALOG_AUTO_SYNC_RUN_ON_START ?? "false").toLowerCase() === "true";
const DATA_LAYER_API_BASE_URL = (process.env.DATA_LAYER_API_BASE_URL ?? "").trim().replace(/\/+$/, "");

let currentRun: Promise<CatalogSyncResult> | null = null;
let intervalHandle: NodeJS.Timeout | null = null;

export interface CatalogSyncResult {
  ok: boolean;
  source: SyncSource;
  added: number;
  updated: number;
  deactivated: number;
  total: number;
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

async function fetchCatalogPayloadFromDataLayer(): Promise<{ items: DataLayerCatalogItem[]; supportsPhotos: boolean }> {
  if (!DATA_LAYER_API_BASE_URL) {
    throw new Error("DATA_LAYER_API_BASE_URL is not configured");
  }

  const preferredUrl = `${DATA_LAYER_API_BASE_URL}/api/catalog/containers`;
  try {
    const response = await axios.get<DataLayerPayload>(preferredUrl, {
      timeout: 30_000,
      validateStatus: (status) => status >= 200 && status < 300,
    });
    const items = Array.isArray(response.data?.containers) ? response.data.containers : [];
    return {
      items: items.filter((item) => normalizeExternalId(item.containerNumber).length > 0),
      supportsPhotos: true,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 405)) {
      const fallbackUrl = `${DATA_LAYER_API_BASE_URL}/api/dashboard/procontainer`;
      const fallbackResponse = await axios.get<DataLayerProcontainerPayload>(fallbackUrl, {
        timeout: 30_000,
        validateStatus: (status) => status >= 200 && status < 300,
      });
      const fallbackItems = (Array.isArray(fallbackResponse.data?.stock) ? fallbackResponse.data.stock : [])
        .map((row) => ({
          containerNumber: row.containerNumber,
          name: row.containerNumber,
          terminal: row.terminal,
          price: row.recommendedPrice,
          photos: undefined,
          isActive: true,
        }));
      return {
        items: fallbackItems.filter((item) => normalizeExternalId(item.containerNumber).length > 0),
        supportsPhotos: false,
      };
    }
    throw error;
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
    const { items: catalogRows, supportsPhotos } = await fetchCatalogPayloadFromDataLayer();
    total = catalogRows.length;

    const processedExternalIds: string[] = [];

    for (const row of catalogRows) {
      const externalId = normalizeExternalId(row.containerNumber);
      if (!externalId) continue;

      processedExternalIds.push(externalId);
      const photos = normalizePhotoUrls(row.photos);
      const payload = {
        externalId,
        name: String(row.name ?? externalId).trim() || externalId,
        size: normalizeSize(row.containerType),
        condition: normalizeCondition(row.condition),
        price: toNumber(row.price) > 0 ? String(toNumber(row.price)) : undefined,
        description: undefined,
        terminalLocation: String(row.terminal ?? "").trim() || undefined,
        isActive: row.isActive !== false,
      } as const;

      const existing = await db.getContainerByExternalId(externalId);
      if (existing) {
        // AUTO policy: overwrite all sync fields.
        await db.updateContainer(existing.id, payload);
        if (supportsPhotos) {
          await replaceContainerPhotos(existing.id, photos);
        }
        updated += 1;
      } else {
        const created = await db.createContainer(payload);
        if (created) {
          if (supportsPhotos) {
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

    return {
      ok: true,
      source,
      added,
      updated,
      deactivated,
      total,
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
