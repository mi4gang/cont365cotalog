/**
 * Auto-initialize database on startup
 * Creates tables and default admin user if they don't exist
 */

import { getDb } from './db';
import bcrypt from 'bcryptjs';
import { TABLE_NAMES } from '../drizzle/schema';

export async function initDatabase() {
  console.log('[Database Init] Starting database initialization...');
  
  const db = await getDb();
  if (!db) {
    console.error('[Database Init] Failed to connect to database');
    return false;
  }

  try {
    // Create users table (for Manus OAuth compatibility, not used for admin auth)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`${TABLE_NAMES.users}\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`openId\` varchar(64) NOT NULL,
        \`name\` text,
        \`email\` varchar(320),
        \`loginMethod\` varchar(64),
        \`role\` enum('user','admin') NOT NULL DEFAULT 'user',
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        \`lastSignedIn\` timestamp NOT NULL DEFAULT (now()),
        CONSTRAINT \`${TABLE_NAMES.users}_id\` PRIMARY KEY(\`id\`),
        CONSTRAINT \`${TABLE_NAMES.users}_openId_unique\` UNIQUE(\`openId\`)
      )
    `);
    console.log('[Database Init] ✓ users table ready');

    // Create admin_users table for local authentication
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`${TABLE_NAMES.adminUsers}\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`username\` varchar(64) NOT NULL,
        \`passwordHash\` varchar(255) NOT NULL,
        \`name\` varchar(128),
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        \`lastSignedIn\` timestamp,
        CONSTRAINT \`${TABLE_NAMES.adminUsers}_id\` PRIMARY KEY(\`id\`),
        CONSTRAINT \`${TABLE_NAMES.adminUsers}_username_unique\` UNIQUE(\`username\`)
      )
    `);
    console.log('[Database Init] ✓ admin_users table ready');

    // Create containers table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`${TABLE_NAMES.containers}\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`externalId\` varchar(64) NOT NULL,
        \`name\` varchar(128) NOT NULL,
        \`size\` varchar(64) NOT NULL,
        \`condition\` enum('new','used') NOT NULL DEFAULT 'used',
        \`price\` decimal(12,2),
        \`description\` text,
        \`terminalLocation\` varchar(128),
        \`serial\` boolean NOT NULL DEFAULT false,
        \`isActive\` boolean NOT NULL DEFAULT true,
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`${TABLE_NAMES.containers}_id\` PRIMARY KEY(\`id\`),
        CONSTRAINT \`${TABLE_NAMES.containers}_externalId_unique\` UNIQUE(\`externalId\`)
      )
    `);
    console.log('[Database Init] ✓ containers table ready');

    // Non-destructive migration for existing tables created before terminalLocation field.
    const terminalLocationColumn = await db.execute(
      `SHOW COLUMNS FROM \`${TABLE_NAMES.containers}\` LIKE 'terminalLocation'`,
    );
    const hasTerminalLocation = ((terminalLocationColumn as any)[0] ?? []).length > 0;
    if (!hasTerminalLocation) {
      await db.execute(
        `ALTER TABLE \`${TABLE_NAMES.containers}\` ADD COLUMN \`terminalLocation\` varchar(128) NULL AFTER \`description\``,
      );
      console.log('[Database Init] ✓ containers.terminalLocation column added');
    }

    const serialColumn = await db.execute(
      `SHOW COLUMNS FROM \`${TABLE_NAMES.containers}\` LIKE 'serial'`,
    );
    const hasSerial = ((serialColumn as any)[0] ?? []).length > 0;
    if (!hasSerial) {
      await db.execute(
        `ALTER TABLE \`${TABLE_NAMES.containers}\` ADD COLUMN \`serial\` boolean NOT NULL DEFAULT false AFTER \`terminalLocation\``,
      );
      console.log('[Database Init] ✓ containers.serial column added');
    }

    // Create container_photos table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`${TABLE_NAMES.containerPhotos}\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`containerId\` int NOT NULL,
        \`url\` varchar(512) NOT NULL,
        \`displayOrder\` int NOT NULL DEFAULT 1,
        \`isMain\` boolean NOT NULL DEFAULT false,
        \`originalName\` varchar(255),
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`${TABLE_NAMES.containerPhotos}_id\` PRIMARY KEY(\`id\`)
      )
    `);
    console.log('[Database Init] ✓ container_photos table ready');

    // Create import_history table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`${TABLE_NAMES.importHistory}\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`adminUserId\` int,
        \`filename\` varchar(255),
        \`containersProcessed\` int DEFAULT 0,
        \`containersAdded\` int DEFAULT 0,
        \`containersUpdated\` int DEFAULT 0,
        \`containersRemoved\` int DEFAULT 0,
        \`status\` enum('pending','processing','completed','failed') DEFAULT 'pending',
        \`errorMessage\` text,
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        \`completedAt\` timestamp,
        CONSTRAINT \`${TABLE_NAMES.importHistory}_id\` PRIMARY KEY(\`id\`)
      )
    `);
    console.log('[Database Init] ✓ import_history table ready');

    // Create catalog_sync_settings table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`${TABLE_NAMES.catalogSyncSettings}\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`mode\` enum('AUTO','MANUAL') NOT NULL DEFAULT 'AUTO',
        \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`${TABLE_NAMES.catalogSyncSettings}_id\` PRIMARY KEY(\`id\`)
      )
    `);
    console.log('[Database Init] ✓ catalog_sync_settings table ready');

    const syncSettingsCheck = await db.execute(
      `SELECT COUNT(*) as count FROM \`${TABLE_NAMES.catalogSyncSettings}\``,
    );
    const hasSyncSettings = (syncSettingsCheck as any)[0]?.[0]?.count > 0;
    if (!hasSyncSettings) {
      await db.execute(
        `INSERT INTO \`${TABLE_NAMES.catalogSyncSettings}\` (\`mode\`) VALUES ('AUTO')`,
      );
      console.log('[Database Init] ✓ Default catalog sync mode created (AUTO)');
    } else {
      console.log('[Database Init] ✓ Catalog sync mode already exists');
    }

    // Check if admin user exists
    const adminCheck = await db.execute(`SELECT COUNT(*) as count FROM \`${TABLE_NAMES.adminUsers}\` WHERE \`username\` = 'admin'`);
    const adminExists = (adminCheck as any)[0]?.[0]?.count > 0;

    if (!adminExists) {
      // Create default admin user (username: admin, password: admin123)
      const passwordHash = await bcrypt.hash('admin123', 10);
      await db.execute(`
        INSERT INTO \`${TABLE_NAMES.adminUsers}\` (\`username\`, \`passwordHash\`, \`name\`) 
        VALUES ('admin', '${passwordHash}', 'Administrator')
      `);
      console.log('[Database Init] ✓ Default admin user created (username: admin, password: admin123)');
    } else {
      console.log('[Database Init] ✓ Admin user already exists');
    }

    console.log('[Database Init] ✅ Database initialization completed successfully');
    return true;
  } catch (error) {
    console.error('[Database Init] ❌ Failed to initialize database:', error);
    return false;
  }
}
