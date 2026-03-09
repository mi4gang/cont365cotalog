import type { Container } from "../drizzle/schema";

export interface ContainerIdentityRecord {
  id: number;
  externalId: string;
  bitrixProductId: number | null;
}

export interface ContainerIdentityIndex {
  byId: Map<number, ContainerIdentityRecord>;
  byExternalId: Map<string, ContainerIdentityRecord>;
  byBitrixProductId: Map<number, ContainerIdentityRecord>;
}

export interface ContainerIdentityLookupInput {
  externalId: string;
  bitrixProductId?: number;
  preferBitrixIdMatching?: boolean;
}

export interface ContainerIdentityMatch {
  existing: ContainerIdentityRecord | null;
  strategy: "bitrix" | "external" | "create";
}

function toIdentityRecord(container: Pick<Container, "id" | "externalId" | "bitrixProductId">): ContainerIdentityRecord {
  return {
    id: container.id,
    externalId: container.externalId,
    bitrixProductId: container.bitrixProductId ?? null,
  };
}

export function buildContainerIdentityIndex(
  containers: Array<Pick<Container, "id" | "externalId" | "bitrixProductId">>,
): ContainerIdentityIndex {
  const index: ContainerIdentityIndex = {
    byId: new Map(),
    byExternalId: new Map(),
    byBitrixProductId: new Map(),
  };

  for (const container of containers) {
    registerContainerIdentity(index, container);
  }

  return index;
}

export function registerContainerIdentity(
  index: ContainerIdentityIndex,
  container: Pick<Container, "id" | "externalId" | "bitrixProductId">,
): void {
  const record = toIdentityRecord(container);
  const previous = index.byId.get(record.id);

  if (previous) {
    index.byExternalId.delete(previous.externalId);
    if (previous.bitrixProductId) {
      index.byBitrixProductId.delete(previous.bitrixProductId);
    }
  }

  index.byId.set(record.id, record);
  index.byExternalId.set(record.externalId, record);
  if (record.bitrixProductId) {
    index.byBitrixProductId.set(record.bitrixProductId, record);
  }
}

export function resolveContainerIdentityMatch(
  index: ContainerIdentityIndex,
  input: ContainerIdentityLookupInput,
): ContainerIdentityMatch {
  const byExternalId = index.byExternalId.get(input.externalId) ?? null;
  const byBitrixProductId = input.bitrixProductId
    ? (index.byBitrixProductId.get(input.bitrixProductId) ?? null)
    : null;
  const preferBitrixIdMatching = input.preferBitrixIdMatching ?? true;

  if (!preferBitrixIdMatching) {
    if (byExternalId) {
      return { existing: byExternalId, strategy: "external" };
    }

    return { existing: null, strategy: "create" };
  }

  if (byExternalId && byBitrixProductId && byExternalId.id !== byBitrixProductId.id) {
    throw new Error(
      `Ambiguous catalog sync identity mapping for externalId="${input.externalId}" and bitrixProductId="${input.bitrixProductId}"`,
    );
  }

  if (byBitrixProductId) {
    return { existing: byBitrixProductId, strategy: "bitrix" };
  }

  if (byExternalId) {
    return { existing: byExternalId, strategy: "external" };
  }

  return { existing: null, strategy: "create" };
}
