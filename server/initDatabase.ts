/**
 * Auto-initialize database on startup
 * Creates tables and default admin user if they don't exist
 */

import { getDb } from './db';
import bcrypt from 'bcryptjs';

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
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`openId\` varchar(64) NOT NULL,
        \`name\` text,
        \`email\` varchar(320),
        \`loginMethod\` varchar(64),
        \`role\` enum('user','admin') NOT NULL DEFAULT 'user',
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        \`lastSignedIn\` timestamp NOT NULL DEFAULT (now()),
        CONSTRAINT \`users_id\` PRIMARY KEY(\`id\`),
        CONSTRAINT \`users_openId_unique\` UNIQUE(\`openId\`)
      )
    `);
    console.log('[Database Init] ✓ users table ready');

    // Create admin_users table for local authentication
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`admin_users\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`username\` varchar(64) NOT NULL,
        \`passwordHash\` varchar(255) NOT NULL,
        \`name\` varchar(128),
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        \`lastSignedIn\` timestamp,
        CONSTRAINT \`admin_users_id\` PRIMARY KEY(\`id\`),
        CONSTRAINT \`admin_users_username_unique\` UNIQUE(\`username\`)
      )
    `);
    console.log('[Database Init] ✓ admin_users table ready');

    // Create containers table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`containers\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`externalId\` varchar(64) NOT NULL,
        \`name\` varchar(128) NOT NULL,
        \`size\` varchar(64) NOT NULL,
        \`condition\` enum('new','used') NOT NULL DEFAULT 'used',
        \`price\` decimal(12,2),
        \`description\` text,
        \`isActive\` boolean NOT NULL DEFAULT true,
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`containers_id\` PRIMARY KEY(\`id\`),
        CONSTRAINT \`containers_externalId_unique\` UNIQUE(\`externalId\`)
      )
    `);
    console.log('[Database Init] ✓ containers table ready');

    // Create container_photos table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`container_photos\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`containerId\` int NOT NULL,
        \`url\` varchar(512) NOT NULL,
        \`displayOrder\` int NOT NULL DEFAULT 1,
        \`isMain\` boolean NOT NULL DEFAULT false,
        \`originalName\` varchar(255),
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`container_photos_id\` PRIMARY KEY(\`id\`)
      )
    `);
    console.log('[Database Init] ✓ container_photos table ready');

    // Create import_history table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`import_history\` (
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
        CONSTRAINT \`import_history_id\` PRIMARY KEY(\`id\`)
      )
    `);
    console.log('[Database Init] ✓ import_history table ready');

    // Check if admin user exists
    const adminCheck = await db.execute(`SELECT COUNT(*) as count FROM \`admin_users\` WHERE \`username\` = 'admin'`);
    const adminExists = (adminCheck as any)[0]?.[0]?.count > 0;

    if (!adminExists) {
      // Create default admin user (username: admin, password: admin123)
      const passwordHash = await bcrypt.hash('admin123', 10);
      await db.execute(`
        INSERT INTO \`admin_users\` (\`username\`, \`passwordHash\`, \`name\`) 
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
