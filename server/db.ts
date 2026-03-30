import { eq, and, inArray, sql, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import {
  InsertUser,
  users,
  adminUsers,
  InsertAdminUser,
  AdminUser,
  containers,
  InsertContainer,
  Container,
  containerPhotos,
  InsertContainerPhoto,
  ContainerPhoto,
  importHistory,
  InsertImportHistory,
  ImportHistory,
  catalogSyncSettings,
  CatalogSyncSettings,
  TABLE_NAMES,
} from "../drizzle/schema";

// Drizzle mysql2 typings may differ between mysql2 entrypoints (promise vs base).
// Keep runtime-safe singleton without over-constraining compile-time $client type.
let _db: any = null;
let _pool: mysql.Pool | null = null;

/**
 * Creates or returns the existing MySQL connection pool.
 */
export function getPool(): mysql.Pool | null {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      console.error("[Database] DATABASE_URL is not defined");
      return null;
    }

    try {
      _pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        ssl: {
          rejectUnauthorized: false,
        },
      });
      console.log("[Database] Connection pool created successfully");
    } catch (error) {
      console.error("[Database] Failed to create pool:", error);
      _pool = null;
    }
  }
  return _pool;
}

/**
 * Returns a Drizzle ORM instance using the connection pool.
 */
export async function getDb() {
  if (!_db) {
    const pool = getPool();
    if (pool) {
      _db = drizzle(pool, {
        mode: "default",
        casing: "snake_case",
      });
    }
  }
  return _db;
}

/**
 * Gets a single connection from the pool.
 */
export async function getConnection(): Promise<mysql.PoolConnection | null> {
  const pool = getPool();
  if (!pool) return null;
  try {
    return await pool.getConnection();
  } catch (error) {
    console.error("[Database] Failed to get connection:", error);
    return null;
  }
}

/**
 * Executes a raw SQL query using the pool.
 */
export async function execute(sql: string, params?: any[]) {
  const pool = getPool();
  if (!pool) throw new Error("Database connection pool not available");
  try {
    return await pool.execute(sql, params);
  } catch (error) {
    console.error("[Database] Execution error:", error);
    throw error;
  }
}

// ==================== Admin Users ====================

export async function createAdminUser(
  username: string,
  password: string,
  name?: string
): Promise<AdminUser | null> {
  const db = await getDb();
  if (!db) return null;
  const passwordHash = await bcrypt.hash(password, 12);
  await db
    .insert(adminUsers)
    .values({ username, passwordHash, name: name || null });
  return (await getAdminUserByUsername(username)) ?? null;
}

export async function getAdminUserByUsername(
  username: string
): Promise<AdminUser | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await execute(
      `SELECT * FROM \`${TABLE_NAMES.adminUsers}\` WHERE \`username\` = ? LIMIT 1`,
      [username]
    );
    return (result as any)[0]?.[0] as AdminUser | undefined;
  } catch (error) {
    return undefined;
  }
}

export async function getAdminUserById(
  id: number
): Promise<AdminUser | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await execute(
      `SELECT * FROM \`${TABLE_NAMES.adminUsers}\` WHERE \`id\` = ? LIMIT 1`,
      [id]
    );
    return (result as any)[0]?.[0] as AdminUser | undefined;
  } catch (error) {
    return undefined;
  }
}

export async function verifyAdminPassword(
  username: string,
  password: string
): Promise<AdminUser | null> {
  const user = await getAdminUserByUsername(username);
  if (!user) return null;
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return null;
  await execute(
    `UPDATE \`${TABLE_NAMES.adminUsers}\` SET \`lastSignedIn\` = NOW() WHERE \`id\` = ?`,
    [user.id]
  );
  return user;
}

export async function updateAdminPassword(
  userId: number,
  newPassword: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db
    .update(adminUsers)
    .set({ passwordHash })
    .where(eq(adminUsers.id, userId));
  return true;
}

// ==================== Containers ====================

export async function getAllContainers(
  activeOnly: boolean = true
): Promise<Container[]> {
  const db = await getDb();
  if (!db) return [];
  if (activeOnly) {
    return db
      .select()
      .from(containers)
      .where(eq(containers.isActive, true))
      .orderBy(containers.id);
  }
  return db.select().from(containers).orderBy(containers.id);
}

export async function getContainerById(
  id: number
): Promise<Container | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(containers)
    .where(eq(containers.id, id))
    .limit(1);
  return result[0];
}

export async function getContainerByExternalId(
  externalId: string
): Promise<Container | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(containers)
    .where(eq(containers.externalId, externalId))
    .limit(1);
  return result[0];
}

export async function getContainersByBitrixProductIds(
  bitrixProductIds: number[]
): Promise<Container[]> {
  const db = await getDb();
  if (!db || bitrixProductIds.length === 0) return [];

  const ids = Array.from(
    new Set(bitrixProductIds.filter((value) => Number.isInteger(value) && value > 0))
  );

  if (ids.length === 0) return [];

  return db
    .select()
    .from(containers)
    .where(inArray(containers.bitrixProductId, ids))
    .orderBy(containers.id);
}

export async function createContainer(
  data: InsertContainer
): Promise<Container | null> {
  const db = await getDb();
  if (!db) return null;
  await db.insert(containers).values(data);
  return (await getContainerByExternalId(data.externalId)) ?? null;
}

export async function updateContainer(
  id: number,
  data: Partial<InsertContainer>
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await db.update(containers).set(data).where(eq(containers.id, id));
  return true;
}

export async function deleteContainer(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await db.transaction(async (tx: any) => {
    await tx.delete(containerPhotos).where(eq(containerPhotos.containerId, id));
    await tx.delete(containers).where(eq(containers.id, id));
  });
  return true;
}

export async function deleteAllContainers(): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await db.transaction(async (tx: any) => {
    await tx.delete(containerPhotos);
    await tx.delete(containers);
  });
  return true;
}

export async function deactivateContainersNotIn(
  externalIds: string[]
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  if (externalIds.length === 0) {
    await db
      .update(containers)
      .set({ isActive: false })
      .where(eq(containers.isActive, true));
    return 0;
  }
  const activeContainers = await db
    .select()
    .from(containers)
    .where(eq(containers.isActive, true));
  const toDeactivate = activeContainers.filter(
    (c: Container) => !externalIds.includes(c.externalId)
  );
  if (toDeactivate.length > 0) {
    await db
      .update(containers)
      .set({ isActive: false })
      .where(
        and(
          eq(containers.isActive, true),
          sql`${containers.externalId} NOT IN (${sql.join(
            externalIds.map(id => sql`${id}`),
            sql`, `
          )})`
        )
      );
  }
  return toDeactivate.length;
}

// ==================== Container Photos ====================

export async function getPhotosByContainerId(
  containerId: number
): Promise<ContainerPhoto[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db
      .select()
      .from(containerPhotos)
      .where(eq(containerPhotos.containerId, containerId))
      .orderBy(containerPhotos.displayOrder);
  } catch (error) {
    console.error(
      "[Database] Failed to get photos for container:",
      containerId,
      error
    );
    return [];
  }
}

export async function getMainPhotoByContainerId(
  containerId: number
): Promise<ContainerPhoto | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  try {
    let result = await db
      .select()
      .from(containerPhotos)
      .where(
        and(
          eq(containerPhotos.containerId, containerId),
          eq(containerPhotos.isMain, true)
        )
      )
      .limit(1);

    if (result.length === 0) {
      result = await db
        .select()
        .from(containerPhotos)
        .where(eq(containerPhotos.containerId, containerId))
        .orderBy(containerPhotos.displayOrder)
        .limit(1);
    }

    return result[0];
  } catch (error) {
    console.error(
      "[Database] Failed to get main photo for container:",
      containerId,
      error
    );
    return undefined;
  }
}

export async function addContainerPhoto(
  data: InsertContainerPhoto
): Promise<ContainerPhoto | null> {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(containerPhotos).values(data).$returningId();
  const photos = await db
    .select()
    .from(containerPhotos)
    .where(eq(containerPhotos.id, result.id))
    .limit(1);
  return photos[0] ?? null;
}

export async function updatePhotoOrder(
  photoId: number,
  displayOrder: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(containerPhotos)
    .set({ displayOrder })
    .where(eq(containerPhotos.id, photoId));
  return true;
}

export async function setMainPhoto(
  containerId: number,
  photoId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await db.transaction(async (tx: any) => {
    await tx
      .update(containerPhotos)
      .set({ isMain: false })
      .where(eq(containerPhotos.containerId, containerId));
    await tx
      .update(containerPhotos)
      .set({ isMain: true })
      .where(eq(containerPhotos.id, photoId));
  });
  return true;
}

export async function deletePhoto(photoId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await db.delete(containerPhotos).where(eq(containerPhotos.id, photoId));
  return true;
}

// ==================== Import History ====================

export async function createImportRecord(
  data: InsertImportHistory
): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(importHistory).values(data).$returningId();
  return result.id;
}

export async function updateImportRecord(
  id: number,
  data: Partial<InsertImportHistory>
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await db.update(importHistory).set(data).where(eq(importHistory.id, id));
  return true;
}

export async function getImportHistory(): Promise<ImportHistory[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(importHistory).orderBy(desc(importHistory.createdAt));
}

// ==================== Catalog Sync Settings ====================

export async function getCatalogSyncSettings(): Promise<
  CatalogSyncSettings | undefined
> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(catalogSyncSettings)
    .orderBy(desc(catalogSyncSettings.id))
    .limit(1);
  return rows[0];
}

export async function getCatalogSyncMode(): Promise<"AUTO" | "MANUAL"> {
  const settings = await getCatalogSyncSettings();
  return settings?.mode === "MANUAL" ? "MANUAL" : "AUTO";
}

export async function setCatalogSyncMode(
  mode: "AUTO" | "MANUAL"
): Promise<"AUTO" | "MANUAL"> {
  const db = await getDb();
  if (!db) return "AUTO";

  const settings = await getCatalogSyncSettings();
  if (settings) {
    await db
      .update(catalogSyncSettings)
      .set({ mode })
      .where(eq(catalogSyncSettings.id, settings.id));
  } else {
    await db.insert(catalogSyncSettings).values({ mode });
  }
  return mode;
}
