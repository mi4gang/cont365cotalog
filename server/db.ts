import { eq, and, inArray, sql, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { 
  InsertUser, users, 
  adminUsers, InsertAdminUser, AdminUser,
  containers, InsertContainer, Container,
  containerPhotos, InsertContainerPhoto, ContainerPhoto,
  importHistory, InsertImportHistory, ImportHistory
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: mysql.Pool | null = null;

/**
 * Creates or returns the existing MySQL connection pool.
 * We use the connection string directly to ensure all parameters (like SSL) are preserved.
 */
export function getPool(): mysql.Pool | null {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      console.error('[Database] DATABASE_URL is not defined');
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
          rejectUnauthorized: false
        }
      });
      console.log('[Database] Connection pool created successfully');
    } catch (error) {
      console.error('[Database] Failed to create pool:', error);
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
        mode: 'default',
        casing: 'snake_case'
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
    console.error('[Database] Failed to get connection:', error);
    return null;
  }
}

/**
 * Executes a raw SQL query using the pool.
 */
export async function execute(sql: string, params?: any[]) {
  const pool = getPool();
  if (!pool) throw new Error('Database connection pool not available');
  try {
    return await pool.execute(sql, params);
  } catch (error) {
    console.error('[Database] Execution error:', error);
    throw error;
  }
}

// ==================== Admin Users ====================

export async function createAdminUser(username: string, password: string, name?: string): Promise<AdminUser | null> {
  const db = await getDb();
  if (!db) return null;
  const passwordHash = await bcrypt.hash(password, 12);
  await db.insert(adminUsers).values({ username, passwordHash, name: name || null });
  return await getAdminUserByUsername(username) ?? null;
}

export async function getAdminUserByUsername(username: string): Promise<AdminUser | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await execute(`SELECT * FROM \`admin_users\` WHERE \`username\` = ? LIMIT 1`, [username]);
    return (result as any)[0]?.[0] as AdminUser | undefined;
  } catch (error) {
    return undefined;
  }
}

export async function getAdminUserById(id: number): Promise<AdminUser | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await execute(`SELECT * FROM \`admin_users\` WHERE \`id\` = ? LIMIT 1`, [id]);
    return (result as any)[0]?.[0] as AdminUser | undefined;
  } catch (error) {
    return undefined;
  }
}

export async function verifyAdminPassword(username: string, password: string): Promise<AdminUser | null> {
  const user = await getAdminUserByUsername(username);
  if (!user) return null;
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return null;
  await execute(`UPDATE \`admin_users\` SET \`lastSignedIn\` = NOW() WHERE \`id\` = ?`, [user.id]);
  return user;
}

// ==================== Containers ====================

export async function getAllContainers(activeOnly: boolean = true): Promise<Container[]> {
  const db = await getDb();
  if (!db) return [];
  if (activeOnly) {
    return db.select().from(containers).where(eq(containers.isActive, true)).orderBy(containers.id);
  }
  return db.select().from(containers).orderBy(containers.id);
}

export async function getContainerByExternalId(externalId: string): Promise<Container | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(containers).where(eq(containers.externalId, externalId)).limit(1);
  return result[0];
}

export async function createContainer(data: InsertContainer): Promise<Container | null> {
  const db = await getDb();
  if (!db) return null;
  await db.insert(containers).values(data);
  return await getContainerByExternalId(data.externalId) ?? null;
}

export async function updateContainer(id: number, data: Partial<InsertContainer>): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await db.update(containers).set(data).where(eq(containers.id, id));
  return true;
}

export async function deleteContainer(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await db.transaction(async (tx) => {
    await tx.delete(containerPhotos).where(eq(containerPhotos.containerId, id));
    await tx.delete(containers).where(eq(containers.id, id));
  });
  return true;
}

export async function deleteAllContainers(): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await db.transaction(async (tx) => {
    await tx.delete(containerPhotos);
    await tx.delete(containers);
  });
  return true;
}

export async function deactivateContainersNotIn(externalIds: string[]): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  if (externalIds.length === 0) {
    await db.update(containers).set({ isActive: false }).where(eq(containers.isActive, true));
    return 0;
  }
  const activeContainers = await db.select().from(containers).where(eq(containers.isActive, true));
  const toDeactivate = activeContainers.filter(c => !externalIds.includes(c.externalId));
  if (toDeactivate.length > 0) {
    await db.update(containers)
      .set({ isActive: false })
      .where(and(
        eq(containers.isActive, true),
        sql`${containers.externalId} NOT IN (${sql.join(externalIds.map(id => sql`${id}`), sql`, `)})`
      ));
  }
  return toDeactivate.length;
}

// ==================== Container Photos ====================

export async function getPhotosByContainerId(containerId: number): Promise<ContainerPhoto[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(containerPhotos).where(eq(containerPhotos.containerId, containerId)).orderBy(containerPhotos.displayOrder);
}

export async function addContainerPhoto(data: InsertContainerPhoto): Promise<ContainerPhoto | null> {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(containerPhotos).values(data).$returningId();
  const photos = await db.select().from(containerPhotos).where(eq(containerPhotos.id, result.id)).limit(1);
  return photos[0] ?? null;
}

export async function updatePhotoOrder(photoId: number, displayOrder: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await db.update(containerPhotos).set({ displayOrder }).where(eq(containerPhotos.id, photoId));
  return true;
}

export async function deletePhoto(photoId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await db.delete(containerPhotos).where(eq(containerPhotos.id, photoId));
  return true;
}

// ==================== Import History ====================

export async function createImportRecord(data: InsertImportHistory): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(importHistory).values(data).$returningId();
  return result.id;
}

export async function updateImportRecord(id: number, data: Partial<InsertImportHistory>): Promise<boolean> {
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
