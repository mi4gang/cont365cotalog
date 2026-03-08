let lockedBy: string | null = null;
let lockedAt: string | null = null;

export function tryAcquireCatalogWriteLock(owner: string): (() => void) | null {
  if (lockedBy) return null;
  lockedBy = owner;
  lockedAt = new Date().toISOString();
  return () => {
    lockedBy = null;
    lockedAt = null;
  };
}

export function getCatalogWriteLockStatus() {
  return {
    isBusy: Boolean(lockedBy),
    lockedBy,
    lockedAt,
  };
}

