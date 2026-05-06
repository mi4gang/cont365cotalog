import { TRPCError } from "@trpc/server";
import axios from "axios";
import { z } from "zod";

import { publicProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { ContainerPhoto } from "../../drizzle/schema";
import { normalizeContainerDisplayName } from "../../shared/containerNaming";

const DATA_LAYER_API_BASE_URL = (process.env.DATA_LAYER_API_BASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "");

interface DataLayerReservedDealContainer {
  id: string;
  bitrixProductId?: number | null;
  containerNumber?: string;
  containerType?: string | null;
  condition?: string | null;
  serial?: boolean | null;
  quantity?: number | null;
  terminal?: string;
  cost?: number;
  recommendedPrice?: number;
  prelimMargin?: number;
  reserveStart?: string | null;
  reserveEnd?: string | null;
  reserveDays?: number | null;
  photos?: string[];
}

interface DataLayerReservedDealPayload {
  active: boolean;
  state?: string;
  dealId: number;
  dealName?: string;
  dealUrl?: string;
  contactName?: string;
  contactPhone?: string;
  managerName?: string;
  containers?: DataLayerReservedDealContainer[];
  generatedAt?: string;
}

interface ReservedDealContainerView {
  id: string;
  bitrixProductId: number | null;
  catalogContainerId: number | null;
  externalId: string | null;
  name: string;
  containerNumber: string;
  size: string | null;
  containerType: string | null;
  condition: "new" | "used" | null;
  terminal: string;
  serial: boolean;
  quantity: number;
  price: string | null;
  reserveStart: string | null;
  reserveEnd: string | null;
  reserveDays: number | null;
  mainPhoto: string | null;
  photos: string[];
  description: string | null;
}

const RESERVED_CATALOG_CONTAINER_KEY_PREFIX = "catalog-";

function parseReservedCatalogContainerKey(value: string): number | null {
  const normalized = String(value || "").trim();
  if (!normalized.startsWith(RESERVED_CATALOG_CONTAINER_KEY_PREFIX)) {
    return null;
  }

  const id = Number(
    normalized.slice(RESERVED_CATALOG_CONTAINER_KEY_PREFIX.length)
  );
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeReservedContainerLookupKey(value: string): string {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return normalized;
  }

  try {
    return decodeURIComponent(normalized);
  } catch {
    return normalized;
  }
}

function buildFallbackPhotos(
  urls: string[] | undefined,
  containerId: number | null
): ContainerPhoto[] {
  const normalizedUrls = Array.from(
    new Set((urls ?? []).map(url => String(url || "").trim()).filter(Boolean))
  );

  if (normalizedUrls.length === 0) {
    return [];
  }

  const now = new Date();
  return normalizedUrls.map((url, index) => ({
    id: -(index + 1),
    containerId: containerId ?? 0,
    url,
    displayOrder: index + 1,
    isMain: index === 0,
    originalName: null,
    createdAt: now,
    updatedAt: now,
  }));
}

function payloadContainsExternalId(
  payload: DataLayerReservedDealPayload,
  externalId: string
): boolean {
  const containers = Array.isArray(payload.containers)
    ? payload.containers
    : [];
  return containers.some(item => {
    const containerNumber = String(item.containerNumber ?? "").trim();
    return containerNumber === externalId;
  });
}

function normalizePositiveInteger(value: unknown): number {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    return 1;
  }
  return normalized;
}

function normalizeReservedCondition(
  value: unknown
): "new" | "used" | null {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (raw === "new" || raw.includes("нов")) return "new";
  if (raw === "used" || raw.includes("б/у") || raw.includes("бу")) {
    return "used";
  }
  return "used";
}

async function loadSerialReservationFallback(
  dealId: number
): Promise<DataLayerReservedDealContainer[]> {
  const [rows] = await db.execute(
    `
      SELECT
        dp.id,
        dp.product_id AS bitrixProductId,
        COALESCE(NULLIF(TRIM(p.name), ''), NULLIF(TRIM(dp.product_name), ''), CONCAT('ID ', COALESCE(dp.product_id, dp.id))) AS containerNumber,
        NULLIF(TRIM(p.container_type), '') AS containerType,
        NULLIF(TRIM(p.condition), '') AS condition,
        COALESCE(dp.quantity, 0) AS quantity,
        COALESCE(dp.reserve_quantity, 0) AS reserveQuantity,
        COALESCE(NULLIF(TRIM(s.title), ''), 'Не указан') AS terminal,
        CAST(COALESCE(dp.cost, 0) AS DECIMAL(12,2)) AS cost,
        CAST(COALESCE(dp.price, 0) AS DECIMAL(12,2)) AS recommendedPrice,
        dp.reserve_start AS reserveStart,
        dp.reserve_end AS reserveEnd
      FROM b_deal_products dp
      INNER JOIN b_deals d ON d.id = dp.deal_id
      LEFT JOIN b_products p ON p.id = dp.product_id
      LEFT JOIN b_stores s ON s.id = COALESCE(dp.store_id, p.store_id)
      WHERE dp.deal_id = ?
        AND d.stage_semantic_id = 'P'
        AND COALESCE(dp.reserve_quantity, 0) > 0
        AND (
          dp.reserve_end IS NULL
          OR dp.reserve_end >= CURDATE()
        )
        AND COALESCE(p.serial, '') = 'Y'
      ORDER BY
        CASE WHEN dp.reserve_end IS NULL THEN 1 ELSE 0 END,
        dp.reserve_end ASC,
        dp.id ASC
    `,
    [dealId]
  );

  const resultRows = Array.isArray(rows) ? rows : [];
  return resultRows.map((row: any) => ({
    id: String(row.id),
    bitrixProductId: Number.isInteger(row.bitrixProductId)
      ? Number(row.bitrixProductId)
      : row.bitrixProductId != null
        ? Number(row.bitrixProductId)
        : null,
    containerNumber: row.containerNumber ?? undefined,
    containerType: row.containerType ?? null,
    condition: row.condition ?? null,
    serial: true,
    quantity: normalizePositiveInteger(row.reserveQuantity ?? row.quantity),
    terminal: row.terminal ?? "Не указан",
    cost: row.cost != null ? Number(row.cost) : undefined,
    recommendedPrice:
      row.recommendedPrice != null ? Number(row.recommendedPrice) : undefined,
    reserveStart: row.reserveStart ?? null,
    reserveEnd: row.reserveEnd ?? null,
  }));
}

async function fetchReservedDealById(
  dealId: number
): Promise<DataLayerReservedDealPayload> {
  if (!DATA_LAYER_API_BASE_URL) {
    throw new Error("DATA_LAYER_API_BASE_URL is not configured");
  }

  const response = await axios.get<DataLayerReservedDealPayload>(
    `${DATA_LAYER_API_BASE_URL}/api/reservations/deal/${dealId}`,
    {
      timeout: 30_000,
      validateStatus: status => status >= 200 && status < 300,
    }
  );

  return response.data;
}

async function refreshReservedDealById(
  dealId: number
): Promise<DataLayerReservedDealPayload | null> {
  if (!DATA_LAYER_API_BASE_URL) {
    return null;
  }

  try {
    const response = await axios.post<{
      ok: boolean;
      payload?: DataLayerReservedDealPayload;
    }>(
      `${DATA_LAYER_API_BASE_URL}/api/reservations/deal/${dealId}/refresh`,
      {},
      {
        timeout: 15_000,
        validateStatus: status =>
          (status >= 200 && status < 300) || status === 409,
      }
    );

    if (response.status === 409) {
      return null;
    }

    if (response.data?.ok && response.data.payload) {
      return response.data.payload;
    }
  } catch (error) {
    console.warn(
      "[reservations] targeted deal refresh failed, falling back to cached reservation payload",
      {
        dealId,
        error: error instanceof Error ? error.message : String(error),
      }
    );
  }

  return null;
}

async function loadReservedDealPayload(
  dealId: number,
  options?: {
    requireExternalId?: string;
  }
): Promise<DataLayerReservedDealPayload> {
  const cachedPayload = await fetchReservedDealById(dealId);
  const requiredExternalId = String(options?.requireExternalId ?? "").trim();

  const hasRequiredContainer = requiredExternalId
    ? payloadContainsExternalId(cachedPayload, requiredExternalId)
    : true;

  if (cachedPayload.active && hasRequiredContainer) {
    return cachedPayload;
  }

  const refreshedPayload = await refreshReservedDealById(dealId);
  return refreshedPayload ?? cachedPayload;
}

async function buildReservedDealView(payload: DataLayerReservedDealPayload) {
  const reservationContainers = Array.isArray(payload.containers)
    ? payload.containers
    : [];
  const serialFallbackContainers = await loadSerialReservationFallback(
    payload.dealId
  );
  const mergedReservationContainers = Array.from(
    new Map(
      [...reservationContainers, ...serialFallbackContainers].map(item => [
        String(item.id),
        item,
      ])
    ).values()
  );

  const bitrixIds = mergedReservationContainers
    .map(item => item.bitrixProductId)
    .filter(
      (value): value is number => Number.isInteger(value) && Number(value) > 0
    );

  const catalogContainers = await db.getContainersByBitrixProductIds(bitrixIds);
  const catalogByBitrixId = new Map(
    catalogContainers
      .filter(item => Number.isInteger(item.bitrixProductId))
      .map(item => [Number(item.bitrixProductId), item])
  );

  const containers: ReservedDealContainerView[] = await Promise.all(
    mergedReservationContainers.map(async item => {
      const bitrixProductId = Number.isInteger(item.bitrixProductId)
        ? Number(item.bitrixProductId)
        : null;
      const quantity = normalizePositiveInteger(item.quantity);
      const catalogContainer = bitrixProductId
        ? (catalogByBitrixId.get(bitrixProductId) ??
          (item.containerNumber
            ? await db.getContainerByExternalId(item.containerNumber)
            : undefined))
        : item.containerNumber
          ? await db.getContainerByExternalId(item.containerNumber)
          : undefined;
      const mainPhoto = catalogContainer
        ? await db.getMainPhotoByContainerId(catalogContainer.id)
        : undefined;
      const fallbackPhotos = buildFallbackPhotos(
        item.photos,
        catalogContainer?.id ?? null
      );
      const serial = Boolean(catalogContainer?.serial ?? item.serial ?? false);
      const size = catalogContainer?.size ?? item.containerType ?? null;
      const name = normalizeContainerDisplayName(
        catalogContainer?.name ??
          item.containerNumber ??
          `Контейнер ${item.id}`,
        size,
        serial
      );

      return {
        id: item.id,
        bitrixProductId,
        catalogContainerId: catalogContainer?.id ?? null,
        externalId: catalogContainer?.externalId ?? null,
        name: name || `Контейнер ${item.id}`,
        containerNumber:
          item.containerNumber ??
          catalogContainer?.name ??
          `Контейнер ${item.id}`,
        size,
        containerType: item.containerType ?? catalogContainer?.size ?? null,
        condition:
          catalogContainer?.condition ??
          normalizeReservedCondition(item.condition),
        terminal:
          item.terminal ?? catalogContainer?.terminalLocation ?? "Не указан",
        serial,
        quantity,
        price:
          catalogContainer?.price ??
          (item.recommendedPrice != null
            ? String(item.recommendedPrice)
            : null),
        reserveStart: item.reserveStart ?? null,
        reserveEnd: item.reserveEnd ?? null,
        reserveDays: item.reserveDays ?? null,
        mainPhoto: mainPhoto?.url ?? fallbackPhotos[0]?.url ?? null,
        photos: Array.from(
          new Set(
            (item.photos ?? [])
              .map(url => String(url || "").trim())
              .filter(Boolean)
          )
        ),
        description: catalogContainer?.description ?? null,
      };
    })
  );

  const totalQuantity = containers.reduce(
    (sum, item) => sum + normalizePositiveInteger(item.quantity),
    0
  );
  const active = payload.active || containers.length > 0;

  return {
    active,
    state: active ? "active" : (payload.state ?? "reserve_not_active"),
    dealId: payload.dealId,
    dealName: payload.dealName ?? `Сделка ${payload.dealId}`,
    dealUrl: payload.dealUrl ?? null,
    contactName: payload.contactName ?? "",
    contactPhone: payload.contactPhone ?? "",
    managerName: payload.managerName ?? "Не указан",
    generatedAt: payload.generatedAt ?? null,
    totalQuantity,
    containers,
  };
}

export const reservationsRouter = router({
  getByDealId: publicProcedure
    .input(z.object({ dealId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const payload = await loadReservedDealPayload(input.dealId);
      return buildReservedDealView(payload);
    }),

  getContainerByDealId: publicProcedure
    .input(
      z.object({
        dealId: z.number().int().positive(),
        externalId: z.string().min(1),
      })
    )
    .query(async ({ input }) => {
      const lookupKey = normalizeReservedContainerLookupKey(input.externalId);
      const catalogContainerId = parseReservedCatalogContainerKey(lookupKey);
      const payload = await loadReservedDealPayload(
        input.dealId,
        catalogContainerId ? undefined : { requireExternalId: lookupKey }
      );
      const reservation = await buildReservedDealView(payload);
      const reservedContainer = reservation.containers.find(item =>
        catalogContainerId
          ? item.catalogContainerId === catalogContainerId
          : (item.externalId ?? item.containerNumber) === lookupKey
      );

      if (!reservation.active || !reservedContainer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reserved container not found",
        });
      }

      const container = catalogContainerId
        ? await db.getContainerById(catalogContainerId)
        : await db.getContainerByExternalId(lookupKey);
      if (!container) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Container not found",
        });
      }

      const photos = await db.getPhotosByContainerId(container.id);
      const resolvedPhotos =
        photos.length > 0
          ? photos
          : buildFallbackPhotos(reservedContainer.photos, container.id);

      return {
        ...container,
        name: normalizeContainerDisplayName(
          container.name,
          container.size,
          container.serial
        ),
        photos: resolvedPhotos,
        reservation: {
          dealId: reservation.dealId,
          dealName: reservation.dealName,
          dealUrl: reservation.dealUrl,
          contactName: reservation.contactName,
          contactPhone: reservation.contactPhone,
          managerName: reservation.managerName,
          totalQuantity: reservation.totalQuantity,
          quantity: reservedContainer.quantity,
          reserveStart: reservedContainer.reserveStart,
          reserveEnd: reservedContainer.reserveEnd,
          reserveDays: reservedContainer.reserveDays,
        },
      };
    }),
});
