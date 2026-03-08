export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  port: process.env.PORT ?? "3000",
  dataLayerApiBaseUrl: process.env.DATA_LAYER_API_BASE_URL ?? "",
  catalogAutoSyncEnabled: process.env.CATALOG_AUTO_SYNC_ENABLED ?? "true",
  catalogAutoSyncIntervalMinutes: process.env.CATALOG_AUTO_SYNC_INTERVAL_MINUTES ?? "60",
  catalogAutoSyncRunOnStart: process.env.CATALOG_AUTO_SYNC_RUN_ON_START ?? "false",
};
