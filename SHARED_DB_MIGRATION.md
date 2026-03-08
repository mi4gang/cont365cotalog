# Shared DB Migration (Catalog + Data Layer)

This document describes how to run the catalog on the same MySQL instance/database as `data-layer-sync`, while keeping catalog tables isolated.

## Goal

- One paid database in Timeweb (`data_layer_bitrix`).
- Clear separation in table names:
  - BI/Data Layer: `b_*`
  - Catalog: `catalog_*`

## New setting

Catalog now supports optional table prefix via env:

- `CATALOG_TABLE_PREFIX=`
  - legacy mode (no prefix): `containers`, `container_photos`, ...
- `CATALOG_TABLE_PREFIX=catalog_`
  - shared-db mode: `catalog_containers`, `catalog_container_photos`, ...

## New autosync setting (optional)

Catalog can pull availability from Data Layer (same source as BI "В наличии"):

- `DATA_LAYER_API_BASE_URL=https://...`
- `CATALOG_AUTO_SYNC_ENABLED=true|false`
- `CATALOG_AUTO_SYNC_INTERVAL_MINUTES=60`
- `CATALOG_AUTO_SYNC_RUN_ON_START=true|false`

Manual import via admin panel remains available and is not removed.

## Concurrency rule (manual import vs autosync)

Catalog write operations are serialized by a single write lock:

- If manual import is running, Data Layer sync (manual/auto) gets `busy` and is skipped.
- If Data Layer sync is running, manual import gets conflict message and should be retried.
- This prevents mixed writes and partial state during simultaneous operations.

## Sandbox test flow

1. Point catalog sandbox app to the same sandbox DB used by data-layer.
2. Set `CATALOG_TABLE_PREFIX=catalog_`.
3. Start catalog app and run an import from admin panel.
4. Verify tables created:
   - `catalog_admin_users`
   - `catalog_users`
   - `catalog_containers`
   - `catalog_container_photos`
   - `catalog_import_history`
5. Verify data-layer tables remain untouched (`b_*`).

## Production cutover (no downtime)

1. Backup old catalog DB (`contcatlog`).
2. Export catalog tables/data from old DB.
3. Import to `data_layer_bitrix` with prefix mapping:
   - `containers -> catalog_containers`
   - `container_photos -> catalog_container_photos`
   - `import_history -> catalog_import_history`
   - `admin_users -> catalog_admin_users`
   - `users -> catalog_users`
   - template SQL: `sql/migrate_catalog_to_shared_db.sql`
4. Update catalog app env:
   - `DATABASE_URL` -> `data_layer_bitrix`
   - `CATALOG_TABLE_PREFIX=catalog_`
5. Restart catalog app and smoke-test:
   - public catalog
   - admin login
   - import
   - photo order/main photo
6. Keep old DB for 1-2 days read-only rollback window.
7. If stable, remove old DB `contcatlog`.

## Rollback

If any issue after cutover:

1. Revert catalog `DATABASE_URL` to old DB.
2. Set `CATALOG_TABLE_PREFIX=` (or old value).
3. Restart catalog app.
