import { eq, and, inArray } from "drizzle-orm";
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
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _connection: mysql.Connection | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL, {
        mode: 'default',
        casing: 'snake_case'
      });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function getConnection() {
  if (!_connection && process.env.DATABASE_URL) {
    try {
      _connection = await mysql.createConnection(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to create connection:", error);
      _connection = null;
    }
  }
  return _connection;
}

export async function execute(sql: string, params?: any[]) {
  const conn = await getConnection();
  if (!conn) throw new Error('Database connection not available');
  return conn.execute(sql, params);
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

  // Use raw SQL to avoid Drizzle ORM quoting issues with MySQL
  const result = await execute(`SELECT * FROM \`admin_users\` WHERE \`username\` = ? LIMIT 1`, [username]);
  return (result as any)[0]?.[0] as AdminUser | undefined;
}

export async function getAdminUserById(id: number): Promise<AdminUser | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  // Use raw SQL to avoid Drizzle ORM quoting issues with MySQL
  const result = await execute(`SELECT * FROM \`admin_users\` WHERE \`id\` = ? LIMIT 1`, [id]);
  return (result as any)[0]?.[0] as AdminUser | undefined;
}

export async function verifyAdminPassword(username: string, password: string): Promise<AdminUser | null> {
  console.log('[Admin Auth] Attempting login for username:', username);
  const user = await getAdminUserByUsername(username);
  if (!user) {
    console.log('[Admin Auth] ❌ User not found');
    return null;
  }

  console.log('[Admin Auth] User found, hash length:', user.passwordHash?.length);
  console.log('[Admin Auth] Hash preview:', user.passwordHash?.substring(0, 20) + '...');
  console.log('[Admin Auth] Password to compare:', password);
  
  const isValid = await bcrypt.compare(password, user.passwordHash);
  console.log('[Admin Auth] Password comparison result:', isValid);
  
  if (!isValid) {
    console.log('[Admin Auth] ❌ Password mismatch');
    return null;
  }

  // Update last signed in using raw SQL
  const db = await getDb();
  if (db) {
    await execute(`UPDATE \`admin_users\` SET \`lastSignedIn\` = NOW() WHERE \`id\` = ?`, [user.id]);
  }

  return user;
}

export async function updateAdminPassword(userId: number, newPassword: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.update(adminUsers)
    .set({ passwordHash })
    .where(eq(adminUsers.id, userId));
  
  return true;
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

export async function getContainerById(id: number): Promise<Container | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(containers).where(eq(containers.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getContainerByExternalId(externalId: string): Promise<Container | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(containers).where(eq(containers.externalId, externalId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createContainer(data: InsertContainer): Promise<Container | null> {
  const db = await getDb();
  if (!db) return null;

  await db.insert(containers).values(data);
  const result = await getContainerByExternalId(data.externalId);
  return result ?? null;
}

export async function updateContainer(id: number, data: Partial<InsertContainer>): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db.update(containers).set(data).where(eq(containers.id, id));
  return true;
}

export async function deactivateContainersNotIn(externalIds: string[]): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  if (externalIds.length === 0) {
    // Deactivate all
    const result = await db.update(containers)
      .set({ isActive: false })
      .where(eq(containers.isActive, true));
    return 0;
  }

  await db.update(containers)
    .set({ isActive: false })
    .where(and(
      eq(containers.isActive, true),
      sql`${containers.externalId} NOT IN (${sql.join(externalIds.map(id => sql`${id}`), sql`, `)})`
    ));
  
  return 0;
}

// ==================== Container Photos ====================

export async function getPhotosByContainerId(containerId: number): Promise<ContainerPhoto[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select()
    .from(containerPhotos)
    .where(eq(containerPhotos.containerId, containerId))
    .orderBy(containerPhotos.displayOrder);
}

export async function getMainPhotoByContainerId(containerId: number): Promise<ContainerPhoto | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  // First try to get the main photo
  let result = await db.select()
    .from(containerPhotos)
    .where(and(
      eq(containerPhotos.containerId, containerId),
      eq(containerPhotos.isMain, true)
    ))
    .limit(1);

  // If no main photo, get the first one by display order
  if (result.length === 0) {
    result = await db.select()
      .from(containerPhotos)
      .where(eq(containerPhotos.containerId, containerId))
      .orderBy(containerPhotos.displayOrder)
      .limit(1);
  }

  return result.length > 0 ? result[0] : undefined;
}

export async function addContainerPhoto(data: InsertContainerPhoto): Promise<ContainerPhoto | null> {
  const db = await getDb();
  if (!db) return null;

  const [result] = await db.insert(containerPhotos).values(data).$returningId();
  
  const photos = await db.select()
    .from(containerPhotos)
    .where(eq(containerPhotos.id, result.id))
    .limit(1);
  
  return photos.length > 0 ? photos[0] : null;
}

export async function updatePhotoOrder(photoId: number, displayOrder: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db.update(containerPhotos)
    .set({ displayOrder })
    .where(eq(containerPhotos.id, photoId));
  
  return true;
}

export async function setMainPhoto(containerId: number, photoId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // First, unset all main photos for this container
  await db.update(containerPhotos)
    .set({ isMain: false })
    .where(eq(containerPhotos.containerId, containerId));

  // Then set the new main photo
  await db.update(containerPhotos)
    .set({ isMain: true })
    .where(eq(containerPhotos.id, photoId));

  return true;
}

export async function deletePhotosByContainerId(containerId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db.delete(containerPhotos).where(eq(containerPhotos.containerId, containerId));
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

export async function getImportHistory(limit: number = 20) {
  const db = await getDb();
  if (!db) return [];

  return db.select()
    .from(importHistory)
    .orderBy(sql`${importHistory.createdAt} DESC`)
    .limit(limit);
}

// ==================== Original User Functions (for Manus OAuth compatibility) ====================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}


// ==================== Container Deletion ====================

export async function deleteContainer(containerId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Delete all photos first
  await db.delete(containerPhotos).where(eq(containerPhotos.containerId, containerId));
  
  // Delete container
  await db.delete(containers).where(eq(containers.id, containerId));
  
  return true;
}

export async function deleteAllContainers(): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Delete all photos
  await db.delete(containerPhotos);
  
  // Delete all containers
  await db.delete(containers);
  
  return true;
}
