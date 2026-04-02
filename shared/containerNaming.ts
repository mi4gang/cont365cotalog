const CONTAINER_NUMBER_RE = /^[A-Z]{4}\d{6,8}$/i;

function casefold(value: unknown): string {
  return normalizeSpace(value).toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeSpace(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function stripContainerNumber(rawName: string): string {
  const normalized = normalizeSpace(rawName).replace(/\*/g, " ");
  if (!normalized) return "";

  const kept: string[] = [];
  for (const token of normalized.split(" ")) {
    const clean = token.trim().replace(/^[,.;:_-]+|[,.;:_-]+$/g, "");
    if (!clean) continue;
    if (CONTAINER_NUMBER_RE.test(clean)) continue;
    kept.push(clean);
  }

  return normalizeSpace(kept.join(" "));
}

function stripSerialDecorators(rawName: string, containerType: string): string {
  let normalized = stripContainerNumber(rawName);
  const cleanType = normalizeSpace(containerType);
  let previous = "";

  while (normalized && normalized !== previous) {
    previous = normalized;
    normalized = normalizeSpace(normalized.replace(/^контейнер\s+/i, ""));

    if (cleanType) {
      const typePrefix = new RegExp(`^${escapeRegExp(cleanType)}\\s+`, "i");
      normalized = normalizeSpace(normalized.replace(typePrefix, ""));
      normalized = normalizeSpace(normalized.replace(/^контейнер\s+/i, ""));
    }
  }

  return normalized;
}

export function buildSerialDisplayName(rawName: unknown, containerType: unknown): string {
  const cleanType = normalizeSpace(containerType);
  const suffix = stripSerialDecorators(String(rawName ?? ""), cleanType);

  if (!cleanType && !suffix) return "Серийный контейнер";
  if (!suffix) return cleanType || "Серийный контейнер";
  if (!cleanType) return suffix;
  if (casefold(suffix) === casefold(cleanType)) return cleanType;
  if (casefold(suffix).startsWith(casefold(cleanType))) return suffix;
  return normalizeSpace(`${cleanType} ${suffix}`);
}

export function normalizeContainerDisplayName(
  rawName: unknown,
  containerType: unknown,
  serial: boolean,
): string {
  const normalizedName = normalizeSpace(rawName);
  if (!serial) return normalizedName;
  return buildSerialDisplayName(normalizedName, containerType);
}

export function buildContainerTitle(
  rawName: unknown,
  containerType: unknown,
  serial: boolean,
): string {
  const displayName = normalizeContainerDisplayName(rawName, containerType, serial);
  if (!displayName) return "Контейнер";
  if (/^контейнер\b/i.test(displayName)) return displayName;
  return `Контейнер ${displayName}`;
}
