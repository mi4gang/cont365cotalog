import { eq, and, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { 
  InsertUser, users, 
  adminUsers, InsertAdminUser, AdminUser,
  containers, InsertContainer, Container,
  containerPhotos, InsertContainerPhoto, ContainerPhoto,
  importHistory, InsertImportHistory
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
      // Create pool using the connection string directly.
      // We append SSL settings if they are not already in the URL to ensure secure transport.
      let connectionString = process.env.DATABASE_URL;
      
      _pool = mysql.createPool({
        uri: connectionString,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        // Explicitly enforce SSL as Timeweb Cloud requires it
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
  if (!pool) {
    console.error('[Database] Pool not available');
    return null;
  }
  
  try {
    const connection = await pool.getConnection();
    return connection;
  } catch (error) {
    console.error('[Database] Failed to get connection from pool:', error);
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
    // pool.execute automatically handles getting and releasing a connection
    const result = await pool.execute(sql, params);
    return result;
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
  
  await db.insert(adminUsers).values({
    username,
    passwordHash,
    name: name || null,
  });

  const result = await getAdminUserByUsername(username);
  return result ?? null;
}

export async function getAdminUserByUsername(username: string): Promise<AdminUser | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  try {
    const result = await execute(`SELECT * FROM \`admin_users\` WHERE \`username\` = ? LIMIT 1`, [username]);
    return (result as any)[0]?.[0] as AdminUser | undefined;
  } catch (error) {
    console.error('[Auth] Error fetching user by username:', error);
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
    console.error('[Auth] Error fetching user by ID:', error);
    return undefined;
  }
}

export async function verifyAdminPassword(username: string, password: string): Promise<AdminUser | null> {
  console.log('[Admin Auth] Attempting login for username:', username);
  
  try {
    const user = await getAdminUserByUsername(username);
    if (!user) {
      console.log('[Admin Auth] ❌ User not found');
      return null;
    }

    console.log('[Admin Auth] User found, hash length:', user.passwordHash?.length);
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    console.log('[Admin Auth] Password comparison result:', isValid);
    
    if (!isValid) {
      console.log('[Admin Auth] ❌ Password mismatch');
      return null;
    }

    // Update last signed in
    await execute(`UPDATE \`admin_users\` SET \`lastSignedIn\` = NOW() WHERE \`id\` = ?`, [user.id]);

    return user;
  } catch (error) {
    console.error('[Admin Auth] Login error:', error);
    return null;
  }
}

export async function updateAdminPassword(userId: number, newPassword: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.update(adminUsers)
      .set({ passwordHash })
      .where(eq(adminUsers.id, userId));
    return true;
  } catch (error) {
    console.error('[Database] Error updating password:', error);
    return false;
  }
}

// ==================== Containers ====================

export async function getAllContainers(activeOnly: boolean = true): Promise<Container[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    if (activeOnly) {
      return db.select().from(containers).where(eq(containers.isActive, true)).orderBy(containers.id);
    }
    return db.select().from(containers).orderBy(containers.id);
  } catch (error) {
    console.error('[Database] Error fetching containers:', error);
    return [];
  }
}

export async function getContainerById(id: number): Promise<Container | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  try {
    const result = await db.select().from(containers).where(eq(containers.id, id)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error('[Database] Error fetching container by ID:', error);
    return undefined;
  }
}

export async function getContainerByExternalId(externalId: string): Promise<Container | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  try {
    const result = await db.select().from(containers).where(eq(containers.externalId, externalId)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error('[Database] Error fetching container by external ID:', error);
    return undefined;
  }
}

export async function createContainer(data: InsertContainer): Promise<Container | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    await db.insert(containers).values(data);
    const result = await getContainerByExternalId(data.externalId);
    return result ?? null;
  } catch (error) {
    console.error('[Database] Error creating container:', error);
    return null;
  }
}

export async function updateContainer(id: number, data: Partial<InsertContainer>): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.update(containers).set(data).where(eq(containers.id, id));
    return true;
  } catch (error) {
    console.error('[Database] Error updating container:', error);
    return false;
  }
}

export async function deactivateContainersNotIn(externalIds: string[]): Promise<number> {
  console.log('[DB] deactivateContainersNotIn called with', externalIds.length, 'IDs');
  
  const db = await getDb();
  if (!db) return 0;

  try {
    if (externalIds.length === 0) {
      await db.update(containers).set({ isActive: false }).where(eq(containers.isActive, true));
      return 0;
    }

    const activeContainers = await db.select().from(containers).where(eq(containers.isActive, true));
    const toDeactivate = activeContainers.filter(c => !externalIds.includes(c.externalId));

    await db.update(containers)
      .set({ isActive: false })
      .where(and(
        eq(containers.isActive, true),
        sql`${containers.externalId} NOT IN (${sql.join(externalIds.map(id => sql`${id}`), sql`, `)})`
      ));
    
    return toDeactivate.length;
  } catch (error) {
    console.error('[Database] Error deactivating containers:', error);
    return 0;
  }
}

// ==================== Container Photos ====================

export async function getPhotosByContainerId(containerId: number): Promise<ContainerPhoto[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    return db.select()
      .from(containerPhotos)
      .where(eq(containerPhotos.containerId, containerId))
      .orderBy(containerPhotos.displayOrder);
  } catch (error) {
    console.error('[Database] Error fetching photos:', error);
    return [];
  }
}

export async function getMainPhotoByContainerId(containerId: number): Promise<ContainerPhoto | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  try {
    let result = await db.select()
      .from(containerPhotos)
      .where(and(
        eq(containerPhotos.containerId, containerId),
        eq(containerPhotos.isMain, true)
      ))
      .limit(1);

    if (result.length === 0) {
      result = await db.select()
        .from(containerPhotos)
        .where(eq(containerPhotos.containerId, containerId))
        .orderBy(containerPhotos.displayOrder)
        .limit(1);
    }

    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error('[Database] Error fetching main photo:', error);
    return undefined;
  }
}

export async function addContainerPhoto(data: InsertContainerPhoto): Promise<ContainerPhoto | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const [result] = await db.insert(containerPhotos).values(data).$returningId();
    const photos = await db.select()
      .from(containerPhotos)
      .where(eq(containerPhotos.id, result.id))
      .limit(1);
    return photos.length > 0 ? photos[0] : null;
  } catch (error) {
    console.error('[Database] Error adding photo:', error);
    return null;
  }
}

export async function updatePhotoOrder(photoId: number, displayOrder: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.update(containerPhotos)
      .set({ displayOrder })
      .where(eq(containerPhotos.id, photoId));
    return true;
  } catch (error) {
    console.error('[Database] Error updating photo order:', error);
    return false;
  }
}

export async function setMainPhoto(containerId: number, photoId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.transaction(async (tx) => {
      await tx.update(containerPhotos)
        .set({ isMain: false })
        .where(eq(containerPhotos.containerId, containerId));
      
      await tx.update(containerPhotos)
        .set({ isMain: true })
        .where(eq(containerPhotos.id, photoId));
    });
    return true;
  } catch (error) {
    console.error('[Database] Error setting main photo:', error);
    return false;
  }
}
