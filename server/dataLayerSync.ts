import axios from "axios";
import * as db from "./db";
import { getCatalogWriteLockStatus, tryAcquireCatalogWriteLock } from "./catalogWriteLock";
import { localizePhotoUrls } from "./localStorage";
import { normalizeContainerDisplayName } from "../shared/containerNaming";
import type { Container } from "../drizzle/schema";
import {
  buildContainerIdentityIndex,
  registerContainerIdentity,
  resolveContainerIdentityMatch,
} from "./dataLayerIdentity";

type SyncSource = "manual" | "auto-startup" | "auto-hourly";
type SyncMode = "AUTO" | "MANUAL";

interface DataLayerCatalogItem {
  bitrixProductId?: number | string;
  containerNumber?: string;
  name?: string;
  terminal?: string;
  price?: number | string;
  containerType?: string | null;
  condition?: string | null;
  description?: string | null;
  serial?: boolean | string | number | null;
  excellent?: boolean | string | number | null;
  photos?: string[];
  isActive?: boolean;
}

interface DataLayerPayload {
  containers?: DataLayerCatalogItem[];
  generatedAt?: string;
}

interface DataLayerCatalogTargetedRefreshPayload {
  ok?: boolean;
  error?: string;
  productIds?: Array<number | string>;
  upsert?: DataLayerCatalogItem[];
  deactivate?: Array<{
    bitrixProductId?: number | string;
  }>;
  generatedAt?: string;
}

interface DataLayerProcontainerPayload {
  stock?: Array<{
    bitrixProductId?: number | string;
    containerNumber?: string;
    terminal?: string;
    recommendedPrice?: number | string;
  }>;
}

interface DataLayerSyncStatus {
  isSyncing?: boolean;
  manual?: {
    lastStartedAt?: string | null;
    lastFinishedAt?: string | null;
    lastSuccess?: boolean | null;
    lastError?: string | null;
    lastScope?: string | null;
    lastSource?: string | null;
  };
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
const CATALOG_SYNC_USE_BITRIX_ID_MATCHING =
  (process.env.CATALOG_SYNC_USE_BITRIX_ID_MATCHING ?? "false").toLowerCase() === "true";
const DATA_LAYER_API_BASE_URL = (process.env.DATA_LAYER_API_BASE_URL ?? "").trim().replace(/\/+$/, "");
const DATA_LAYER_MANUAL_SYNC_TIMEOUT_MS = Math.max(
  10_000,
  Number(process.env.DATA_LAYER_MANUAL_SYNC_TIMEOUT_MS ?? 600_000),
);
const DATA_LAYER_MANUAL_SYNC_POLL_MS = Math.max(
  1_000,
  Number(process.env.DATA_LAYER_MANUAL_SYNC_POLL_MS ?? 2_000),
);
const DATA_LAYER_MANUAL_SYNC_SCOPE = normalizeDataLayerManualSyncScope(
  process.env.DATA_LAYER_MANUAL_SYNC_SCOPE,
);
const TARGET_REFRESH_MISSING_TERMINAL_RETRY_DELAYS_MS = [45_000, 180_000] as const;

let currentRun: Promise<CatalogSyncResult> | null = null;
let intervalHandle: NodeJS.Timeout | null = null;
const scheduledTargetRefreshRetries = new Set<string>();

export interface CatalogSyncResult {
  ok: boolean;
  source: SyncSource;
  added: number;
  updated: number;
  deactivated: number;
  total: number;
  error?: string;
}

export interface CatalogSyncStartResult extends CatalogSyncResult {
  started: boolean;
  alreadyRunning: boolean;
}

export interface CatalogTargetedRefreshResult {
  ok: boolean;
  added: number;
  updated: number;
  deactivated: number;
  productIds: number[];
  error?: string;
}

export function normalizeDataLayerManualSyncScope(value: unknown): "catalog" | "fast" | "full" {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "fast" || raw === "full" || raw === "catalog") {
    return raw;
  }
  return "catalog";
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = Number(value.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

const CONTAINER_NUMBER_RE = /\b[A-Z]{4}\d{6,8}\b/i;

function normalizeExternalId(raw: unknown): string {
  const normalized = String(raw ?? "").replace(/\s+/g, " ").trim();
  const containerNumber = normalized.match(CONTAINER_NUMBER_RE)?.[0];
  return containerNumber ? containerNumber.toUpperCase() : normalized;
}

function normalizeBitrixProductId(raw: unknown): number | undefined {
  if (raw === null || raw === undefined || raw === "") return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return undefined;
  return value;
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const raw = String(value ?? "").trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "y" || raw === "yes";
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
  const unique = new Set<string>();
  return value
    .map((item) => String(item ?? "").trim())
    .filter((url) => {
      if (!/^https?:\/\//i.test(url)) return false;
      if (unique.has(url)) return false;
      unique.add(url);
      return true;
    });
}

function getSerialSalesDescription(): string {
  return "На фото показан идентичный контейнер этой модели. Это новая типовая позиция: такие контейнеры есть в наличии в количестве, а под поставку подбирается такой же контейнер по этой модели.";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchDataLayerSyncStatus(): Promise<DataLayerSyncStatus> {
  if (!DATA_LAYER_API_BASE_URL) {
    throw new Error("DATA_LAYER_API_BASE_URL is not configured");
  }

  const response = await axios.get<DataLayerSyncStatus>(`${DATA_LAYER_API_BASE_URL}/api/sync/status`, {
    timeout: 30_000,
    validateStatus: (status) => status >= 200 && status < 300,
  });
  return response.data ?? {};
}

async function triggerDataLayerSyncIfNeeded(source: SyncSource): Promise<void> {
  if (!DATA_LAYER_API_BASE_URL) {
    throw new Error("DATA_LAYER_API_BASE_URL is not configured");
  }

  const statusBefore = await fetchDataLayerSyncStatus();
  const previousManualStartedAt = statusBefore.manual?.lastStartedAt ?? null;
  const upstreamSource = source === "manual" ? "manual" : `catalog-${source}`;
  const runUrl =
    `${DATA_LAYER_API_BASE_URL}/api/sync/run?scope=${DATA_LAYER_MANUAL_SYNC_SCOPE}` +
    `&source=${encodeURIComponent(upstreamSource)}`;

  const runResponse = await axios.post(runUrl, undefined, {
    timeout: 30_000,
    validateStatus: (status) => (status >= 200 && status < 300) || status === 409,
  });

  if (runResponse.status === 409) {
    const errorCode = String(runResponse.data?.error ?? "");
    if (errorCode && errorCode !== "sync_already_running") {
      throw new Error(`Data Layer sync rejected: ${errorCode}`);
    }
  }

  const deadline = Date.now() + DATA_LAYER_MANUAL_SYNC_TIMEOUT_MS;

  while (Date.now() < deadline) {
    let status: DataLayerSyncStatus;
    try {
      status = await fetchDataLayerSyncStatus();
    } catch (error) {
      console.warn("[catalog-sync] Data Layer status poll failed; keeping sync pending", {
        error: error instanceof Error ? error.message : String(error),
      });
      await sleep(DATA_LAYER_MANUAL_SYNC_POLL_MS);
      continue;
    }

    if (!status.isSyncing) {
      const manualStartedAt = status.manual?.lastStartedAt ?? null;
      const manualRunStarted = manualStartedAt !== previousManualStartedAt;
      const manualFailed = status.manual?.lastSuccess === false;
      const manualError = String(status.manual?.lastError ?? "").trim();

      if (manualRunStarted && manualFailed) {
        throw new Error(manualError || "Data Layer manual sync failed");
      }

      return;
    }

    await sleep(DATA_LAYER_MANUAL_SYNC_POLL_MS);
  }

  throw new Error("Timed out waiting for Data Layer sync to finish");
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
          bitrixProductId: row.bitrixProductId,
          containerNumber: row.containerNumber,
          name: row.containerNumber,
          terminal: row.terminal,
          price: row.recommendedPrice,
          photos: undefined,
          serial: false,
          excellent: false,
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

export function photoUrlsMatchCatalogPayload(
  existingPhotos: Array<{ url: string }>,
  photoUrls: string[],
): boolean {
  if (existingPhotos.length !== photoUrls.length) {
    return false;
  }

  return existingPhotos.every((photo, index) => photo.url === photoUrls[index]);
}

async function syncContainerPhotos(containerId: number, photoUrls: string[]): Promise<void> {
  // Data Layer photo payload can be temporarily empty when image mirror is stale.
  // Keep existing catalog photos instead of wiping them on an otherwise valid sync.
  if (photoUrls.length === 0) {
    return;
  }

  const catalogPhotoUrls = await localizePhotoUrls(photoUrls);
  if (catalogPhotoUrls.length === 0) {
    return;
  }

  const existingPhotos = await db.getPhotosByContainerId(containerId);
  if (photoUrlsMatchCatalogPayload(existingPhotos, catalogPhotoUrls)) {
    return;
  }

  await db.replaceContainerPhotos(containerId, catalogPhotoUrls);
}

function findCatalogRow(
  rows: DataLayerCatalogItem[],
  input: { bitrixProductId?: number | null; externalId?: string | null },
): DataLayerCatalogItem | null {
  const bitrixProductId = normalizeBitrixProductId(input.bitrixProductId);
  const externalId = normalizeExternalId(input.externalId);

  if (bitrixProductId) {
    const byBitrixId = rows.find((row) => normalizeBitrixProductId(row.bitrixProductId) === bitrixProductId);
    if (byBitrixId) {
      return byBitrixId;
    }
  }

  if (externalId) {
    const byExternalId = rows.find((row) => normalizeExternalId(row.containerNumber) === externalId);
    if (byExternalId) {
      return byExternalId;
    }
  }

  return null;
}

export async function ensureCatalogContainerHydrated(input: {
  bitrixProductId?: number | null;
  externalId?: string | null;
  reservationSnapshot?: {
    containerNumber?: string | null;
    containerType?: string | null;
    terminal?: string | null;
    recommendedPrice?: string | number | null;
    photos?: string[] | null;
    serial?: boolean | null;
    excellent?: boolean | null;
    description?: string | null;
    condition?: "new" | "used" | null;
  } | null;
}): Promise<Container | null> {
  const requestedBitrixProductId = normalizeBitrixProductId(input.bitrixProductId);
  const requestedExternalId = normalizeExternalId(input.externalId);
  const reservationSnapshot = input.reservationSnapshot ?? null;

  if (!requestedBitrixProductId && !requestedExternalId) {
    return null;
  }

  const releaseLock = tryAcquireCatalogWriteLock("reservation-targeted-hydrate");
  if (!releaseLock) {
    return null;
  }

  try {
    const existingContainers = await db.getAllContainers(false);
    const identityIndex = buildContainerIdentityIndex(existingContainers);
    let { items: catalogRows, supportsPhotos } = await fetchCatalogPayloadFromDataLayer();
    let row = findCatalogRow(catalogRows, {
      bitrixProductId: requestedBitrixProductId,
      externalId: requestedExternalId,
    });

    if (!row) {
      try {
        await triggerDataLayerSyncIfNeeded("manual");
        const refreshed = await fetchCatalogPayloadFromDataLayer();
        catalogRows = refreshed.items;
        supportsPhotos = refreshed.supportsPhotos;
        row = findCatalogRow(catalogRows, {
          bitrixProductId: requestedBitrixProductId,
          externalId: requestedExternalId,
        });
      } catch (error) {
        console.warn("[catalog-sync] targeted reservation hydration could not trigger upstream sync", {
          bitrixProductId: requestedBitrixProductId ?? null,
          externalId: requestedExternalId || null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (!row) {
      const fallbackExternalId =
        requestedExternalId ||
        normalizeExternalId(reservationSnapshot?.containerNumber);
      const fallbackPhotos = normalizePhotoUrls(reservationSnapshot?.photos);
      const fallbackSerial = Boolean(reservationSnapshot?.serial);
      const fallbackExcellent = Boolean(reservationSnapshot?.excellent);

      if (!fallbackExternalId) {
        if (requestedBitrixProductId) {
          return (await db.getContainersByBitrixProductIds([requestedBitrixProductId]))[0] ?? null;
        }
        return null;
      }

      const fallbackPayload = {
        externalId: fallbackExternalId,
        bitrixProductId: requestedBitrixProductId,
        name: normalizeContainerDisplayName(
          fallbackExternalId,
          reservationSnapshot?.containerType ?? null,
          fallbackSerial,
        ) || fallbackExternalId,
        size: normalizeSize(reservationSnapshot?.containerType),
        condition: reservationSnapshot?.condition ?? "used",
        price: toNumber(reservationSnapshot?.recommendedPrice) > 0
          ? String(toNumber(reservationSnapshot?.recommendedPrice))
          : undefined,
        description: fallbackSerial
          ? getSerialSalesDescription()
          : String(reservationSnapshot?.description ?? "").trim() || undefined,
        terminalLocation: String(reservationSnapshot?.terminal ?? "").trim() || undefined,
        serial: fallbackSerial,
        excellent: fallbackExcellent,
        isActive: true,
      } as const;

      const { existing } = resolveContainerIdentityMatch(identityIndex, {
        externalId: fallbackExternalId,
        bitrixProductId: requestedBitrixProductId,
        preferBitrixIdMatching: CATALOG_SYNC_USE_BITRIX_ID_MATCHING,
      });

      let containerId: number | null = null;

      if (existing) {
        await db.updateContainer(existing.id, fallbackPayload);
        await syncContainerPhotos(existing.id, fallbackPhotos);
        containerId = existing.id;
      } else {
        const created = await db.createContainer(fallbackPayload);
        if (!created) {
          return null;
        }
        await syncContainerPhotos(created.id, fallbackPhotos);
        containerId = created.id;
      }

      return containerId ? ((await db.getContainerById(containerId)) ?? null) : null;
    }

    const externalId = normalizeExternalId(row.containerNumber) || requestedExternalId;
    const bitrixProductId = normalizeBitrixProductId(row.bitrixProductId) ?? requestedBitrixProductId;
    const photos = normalizePhotoUrls(row.photos);
    const serial = toBoolean(row.serial);
    const excellent = toBoolean(row.excellent);
    const normalizedName = normalizeContainerDisplayName(
      serial ? (row.containerNumber ?? row.name ?? externalId) : (row.name ?? externalId),
      row.containerType,
      serial,
    );
    const payload = {
      externalId,
      bitrixProductId,
      name: normalizedName || externalId,
      size: normalizeSize(row.containerType),
      condition: normalizeCondition(row.condition),
      price: toNumber(row.price) > 0 ? String(toNumber(row.price)) : undefined,
      description: serial
        ? getSerialSalesDescription()
        : String(row.description ?? "").trim() || undefined,
      terminalLocation: String(row.terminal ?? "").trim() || undefined,
      serial,
      excellent,
      isActive: row.isActive !== false,
    } as const;

    const { existing } = resolveContainerIdentityMatch(identityIndex, {
      externalId,
      bitrixProductId,
      preferBitrixIdMatching: CATALOG_SYNC_USE_BITRIX_ID_MATCHING,
    });

    let containerId: number | null = null;

    if (existing) {
      await db.updateContainer(existing.id, payload);
      if (supportsPhotos) {
        await syncContainerPhotos(existing.id, photos);
      }
      containerId = existing.id;
    } else {
      const created = await db.createContainer(payload);
      if (!created) {
        return null;
      }
      if (supportsPhotos) {
        await syncContainerPhotos(created.id, photos);
      }
      containerId = created.id;
    }

    if (!containerId) {
      return null;
    }

    return (await db.getContainerById(containerId)) ?? null;
  } finally {
    releaseLock();
  }
}

async function hasExistingContainerPhotos(containerId: number): Promise<boolean> {
  const existingPhotos = await db.getPhotosByContainerId(containerId);
  return existingPhotos.length > 0;
}

export function shouldPublishCatalogRow(
  supportsPhotos: boolean,
  photoUrls: string[],
  hasExistingPhotos: boolean,
  options?: {
    terminalLocation?: string | null;
    serial?: boolean | null;
  },
): boolean {
  void supportsPhotos;
  void photoUrls;
  void hasExistingPhotos;
  if (options?.serial) return true;
  return hasPublishableTerminalLocation(options?.terminalLocation);
}

export function hasPublishableTerminalLocation(value: unknown): boolean {
  const terminal = String(value ?? "").trim().toLowerCase();
  return terminal.length > 0 && terminal !== "не указан";
}

function getMissingTerminalRetryKey(row: DataLayerCatalogItem): string | null {
  const productId = normalizeBitrixProductId(row.bitrixProductId);
  if (productId) return `product:${productId}`;

  const externalId = normalizeExternalId(row.containerNumber);
  if (externalId) return `external:${externalId}`;

  return null;
}

function shouldRetryMissingTerminal(row: DataLayerCatalogItem): boolean {
  if (row.isActive === false) return false;
  if (toBoolean(row.serial)) return false;
  return !hasPublishableTerminalLocation(row.terminal);
}

function scheduleMissingTerminalTargetRefreshRetry(
  row: DataLayerCatalogItem,
  nextAttempt: number,
): void {
  if (nextAttempt >= TARGET_REFRESH_MISSING_TERMINAL_RETRY_DELAYS_MS.length) {
    return;
  }

  const key = getMissingTerminalRetryKey(row);
  if (!key || scheduledTargetRefreshRetries.has(key)) {
    return;
  }

  const productId = normalizeBitrixProductId(row.bitrixProductId);
  const containerNumber = normalizeExternalId(row.containerNumber);
  const delayMs = TARGET_REFRESH_MISSING_TERMINAL_RETRY_DELAYS_MS[nextAttempt];

  scheduledTargetRefreshRetries.add(key);
  setTimeout(() => {
    scheduledTargetRefreshRetries.delete(key);
    void refreshCatalogContainerFromDataLayer({
      bitrixProductId: productId,
      containerNumber,
      retryAttempt: nextAttempt,
    });
  }, delayMs).unref?.();
}

function buildCatalogPayloadFromDataLayerRow(row: DataLayerCatalogItem) {
  const externalId = normalizeExternalId(row.containerNumber);
  const bitrixProductId = normalizeBitrixProductId(row.bitrixProductId);
  const serial = toBoolean(row.serial);
  const excellent = toBoolean(row.excellent);
  const normalizedName = normalizeContainerDisplayName(
    serial ? (row.containerNumber ?? row.name ?? externalId) : (row.name ?? externalId),
    row.containerType,
    serial,
  );

  return {
    externalId,
    bitrixProductId,
    photos: normalizePhotoUrls(row.photos),
    payload: {
      externalId,
      bitrixProductId,
      name: normalizedName || externalId,
      size: normalizeSize(row.containerType),
      condition: normalizeCondition(row.condition),
      price: toNumber(row.price) > 0 ? String(toNumber(row.price)) : undefined,
      description: serial
        ? getSerialSalesDescription()
        : String(row.description ?? "").trim() || undefined,
      terminalLocation: String(row.terminal ?? "").trim() || undefined,
      serial,
      excellent,
      isActive: row.isActive !== false,
    } as const,
  };
}

async function applyDataLayerCatalogRow(
  identityIndex: ReturnType<typeof buildContainerIdentityIndex>,
  row: DataLayerCatalogItem,
): Promise<"added" | "updated" | "skipped"> {
  const { externalId, bitrixProductId, photos, payload } = buildCatalogPayloadFromDataLayerRow(row);
  if (!externalId) {
    return "skipped";
  }

  const { existing } = resolveContainerIdentityMatch(identityIndex, {
    externalId,
    bitrixProductId,
    preferBitrixIdMatching: CATALOG_SYNC_USE_BITRIX_ID_MATCHING,
  });

  if (existing) {
    const shouldPublish = shouldPublishCatalogRow(
      true,
      photos,
      await hasExistingContainerPhotos(existing.id),
      {
        terminalLocation: payload.terminalLocation,
        serial: payload.serial,
      },
    );
    await db.updateContainer(existing.id, {
      ...payload,
      isActive: payload.isActive && shouldPublish,
    });
    registerContainerIdentity(identityIndex, {
      ...existing,
      externalId,
      bitrixProductId: bitrixProductId ?? existing.bitrixProductId,
    });
    await syncContainerPhotos(existing.id, photos);
    return "updated";
  }

  const shouldPublish = shouldPublishCatalogRow(true, photos, false, {
    terminalLocation: payload.terminalLocation,
    serial: payload.serial,
  });
  const created = await db.createContainer({
    ...payload,
    isActive: payload.isActive && shouldPublish,
  });
  if (!created) {
    return "skipped";
  }

  registerContainerIdentity(identityIndex, created);
  await syncContainerPhotos(created.id, photos);
  return "added";
}

export async function refreshCatalogContainerFromDataLayer(input: {
  bitrixProductId?: number | string | null;
  productIds?: Array<number | string> | null;
  containerNumber?: string | null;
  retryAttempt?: number;
}): Promise<CatalogTargetedRefreshResult> {
  const releaseLock = tryAcquireCatalogWriteLock("data-layer-targeted-refresh");
  if (!releaseLock) {
    const lockStatus = getCatalogWriteLockStatus();
    return {
      ok: false,
      added: 0,
      updated: 0,
      deactivated: 0,
      productIds: [],
      error: `Catalog is busy: ${lockStatus.lockedBy ?? "unknown"}`,
    };
  }

  try {
    if (!DATA_LAYER_API_BASE_URL) {
      throw new Error("DATA_LAYER_API_BASE_URL is not configured");
    }

    const response = await axios.post<DataLayerCatalogTargetedRefreshPayload>(
      `${DATA_LAYER_API_BASE_URL}/api/catalog/containers/refresh`,
      {
        productIds: normalizeTargetProductIds(input.productIds),
        productId: input.bitrixProductId ?? undefined,
        containerNumber: normalizeExternalId(input.containerNumber),
      },
      {
        timeout: 90_000,
        validateStatus: (status) => (status >= 200 && status < 300) || status === 404 || status === 409,
      },
    );

    if (response.status === 409) {
      return {
        ok: false,
        added: 0,
        updated: 0,
        deactivated: 0,
        productIds: [],
        error: "Data Layer sync is already running",
      };
    }

    if (response.status === 404 || !response.data?.ok) {
      return {
        ok: false,
        added: 0,
        updated: 0,
        deactivated: 0,
        productIds: [],
        error: response.data?.error || "Data Layer target refresh failed",
      };
    }

    let added = 0;
    let updated = 0;
    const identityIndex = buildContainerIdentityIndex(await db.getAllContainers(false));

    for (const row of response.data.upsert ?? []) {
      const result = await applyDataLayerCatalogRow(identityIndex, row);
      if (result === "added") added += 1;
      if (result === "updated") updated += 1;
      if (shouldRetryMissingTerminal(row)) {
        scheduleMissingTerminalTargetRefreshRetry(row, (input.retryAttempt ?? -1) + 1);
      }
    }

    const productIds = (response.data.productIds ?? [])
      .map((value) => normalizeBitrixProductId(value))
      .filter((value): value is number => value !== undefined);
    const deactivateProductIds = (response.data.deactivate ?? [])
      .map((row) => normalizeBitrixProductId(row.bitrixProductId))
      .filter((value): value is number => value !== undefined);
    const deactivated = await db.deactivateContainersByBitrixProductIds(deactivateProductIds);

    return {
      ok: true,
      added,
      updated,
      deactivated,
      productIds,
    };
  } catch (error) {
    return {
      ok: false,
      added: 0,
      updated: 0,
      deactivated: 0,
      productIds: [],
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    releaseLock();
  }
}

function normalizeTargetProductIds(values: Array<number | string> | null | undefined): number[] {
  const seen = new Set<number>();
  const productIds: number[] = [];

  for (const value of values ?? []) {
    const productId = normalizeBitrixProductId(value);
    if (productId === undefined || seen.has(productId)) {
      continue;
    }

    seen.add(productId);
    productIds.push(productId);
  }

  return productIds;
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
    await triggerDataLayerSyncIfNeeded(source);
    const { items: catalogRows, supportsPhotos } = await fetchCatalogPayloadFromDataLayer();
    total = catalogRows.length;
    const identityIndex = buildContainerIdentityIndex(await db.getAllContainers(false));

    const processedExternalIds: string[] = [];
    const processedBitrixProductIds: number[] = [];

    for (const row of catalogRows) {
      const externalId = normalizeExternalId(row.containerNumber);
      if (!externalId) continue;

      processedExternalIds.push(externalId);
      const photos = normalizePhotoUrls(row.photos);
      const bitrixProductId = normalizeBitrixProductId(row.bitrixProductId);
      if (bitrixProductId) {
        processedBitrixProductIds.push(bitrixProductId);
      }
      const serial = toBoolean(row.serial);
      const excellent = toBoolean(row.excellent);
      const normalizedName = normalizeContainerDisplayName(
        serial ? (row.containerNumber ?? row.name ?? externalId) : (row.name ?? externalId),
        row.containerType,
        serial,
      );
      const payload = {
        externalId,
        bitrixProductId,
        name: normalizedName || externalId,
        size: normalizeSize(row.containerType),
        condition: normalizeCondition(row.condition),
        price: toNumber(row.price) > 0 ? String(toNumber(row.price)) : undefined,
        description: serial
          ? getSerialSalesDescription()
          : String(row.description ?? "").trim() || undefined,
        terminalLocation: String(row.terminal ?? "").trim() || undefined,
        serial,
        excellent,
        isActive: row.isActive !== false,
      } as const;

      const { existing } = resolveContainerIdentityMatch(identityIndex, {
        externalId,
        bitrixProductId,
        preferBitrixIdMatching: CATALOG_SYNC_USE_BITRIX_ID_MATCHING,
      });

      if (existing) {
        const shouldPublish = shouldPublishCatalogRow(
          supportsPhotos,
          photos,
          await hasExistingContainerPhotos(existing.id),
          {
            terminalLocation: payload.terminalLocation,
            serial: payload.serial,
          },
        );
        // AUTO policy: overwrite all sync fields.
        await db.updateContainer(existing.id, {
          ...payload,
          isActive: payload.isActive && shouldPublish,
        });
        registerContainerIdentity(identityIndex, {
          ...existing,
          externalId,
          bitrixProductId: bitrixProductId ?? existing.bitrixProductId,
        });
        if (supportsPhotos) {
          await syncContainerPhotos(existing.id, photos);
        }
        updated += 1;
      } else {
        const shouldPublish = shouldPublishCatalogRow(supportsPhotos, photos, false, {
          terminalLocation: payload.terminalLocation,
          serial: payload.serial,
        });
        const created = await db.createContainer({
          ...payload,
          isActive: payload.isActive && shouldPublish,
        });
        if (created) {
          registerContainerIdentity(identityIndex, created);
          if (supportsPhotos) {
            await syncContainerPhotos(created.id, photos);
          }
        }
        added += 1;
      }
    }

    deactivated = await db.deactivateContainersNotInCatalogIdentities({
      externalIds: processedExternalIds,
      bitrixProductIds: processedBitrixProductIds,
    });

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
      stableIdentityMatching: CATALOG_SYNC_USE_BITRIX_ID_MATCHING,
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

export function startCatalogSync(source: SyncSource = "manual"): CatalogSyncStartResult {
  if (currentRun) {
    return {
      ok: true,
      source,
      added: state.lastAdded,
      updated: state.lastUpdated,
      deactivated: state.lastDeactivated,
      total: state.lastTotal,
      started: false,
      alreadyRunning: true,
    };
  }

  currentRun = runSyncInternal(source).finally(() => {
    currentRun = null;
  });

  void currentRun.then((result) => {
    if (!result.ok) {
      console.error(`[catalog-sync] ${source} failed:`, result.error);
    }
  });

  return {
    ok: true,
    source,
    added: 0,
    updated: 0,
    deactivated: 0,
    total: 0,
    started: true,
    alreadyRunning: false,
  };
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
