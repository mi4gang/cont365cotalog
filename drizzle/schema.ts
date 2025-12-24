import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";

/**
 * Admin users table for local authentication (not Manus OAuth)
 * Used for employees to access admin panel
 */
export const adminUsers = mysqlTable("admin_users", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  name: varchar("name", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn"),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;

/**
 * Containers table - main catalog items
 * Stores container information imported from CSV
 */
export const containers = mysqlTable("containers", {
  id: int("id").autoincrement().primaryKey(),
  /** External ID from CSV file (e.g., FONU11320953) - used for matching on re-import */
  externalId: varchar("externalId", { length: 64 }).notNull().unique(),
  /** Display name (e.g., "Контейнер #19") */
  name: varchar("name", { length: 128 }).notNull(),
  /** Container size/type (e.g., "10 фут", "20 фут 2.6", "40 фут") */
  size: varchar("size", { length: 64 }).notNull(),
  /** Container condition */
  condition: mysqlEnum("condition", ["new", "used"]).default("used").notNull(),
  /** Price in rubles */
  price: decimal("price", { precision: 12, scale: 2 }),
  /** Additional description */
  description: text("description"),
  /** Is container available/visible in catalog */
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Container = typeof containers.$inferSelect;
export type InsertContainer = typeof containers.$inferInsert;

/**
 * Container photos table
 * Stores photo URLs and display settings for each container
 * Photo order and main photo selection are preserved during CSV re-import
 */
export const containerPhotos = mysqlTable("container_photos", {
  id: int("id").autoincrement().primaryKey(),
  /** Reference to container */
  containerId: int("containerId").notNull(),
  /** Photo URL (external URL from CSV) */
  url: varchar("url", { length: 512 }).notNull(),
  /** Display order in gallery (1 = first, etc.) */
  displayOrder: int("displayOrder").default(1).notNull(),
  /** Is this the main/thumbnail photo for catalog preview */
  isMain: boolean("isMain").default(false).notNull(),
  /** Original filename or identifier */
  originalName: varchar("originalName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContainerPhoto = typeof containerPhotos.$inferSelect;
export type InsertContainerPhoto = typeof containerPhotos.$inferInsert;

/**
 * CSV import history - tracks imports for audit
 */
export const importHistory = mysqlTable("import_history", {
  id: int("id").autoincrement().primaryKey(),
  /** Admin user who performed import */
  adminUserId: int("adminUserId"),
  /** Original filename */
  filename: varchar("filename", { length: 255 }),
  /** Number of containers processed */
  containersProcessed: int("containersProcessed").default(0),
  /** Number of new containers added */
  containersAdded: int("containersAdded").default(0),
  /** Number of existing containers updated */
  containersUpdated: int("containersUpdated").default(0),
  /** Number of containers removed (not in new CSV) */
  containersRemoved: int("containersRemoved").default(0),
  /** Import status */
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending"),
  /** Error message if failed */
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type ImportHistory = typeof importHistory.$inferSelect;
export type InsertImportHistory = typeof importHistory.$inferInsert;

// Keep original users table for Manus OAuth compatibility (but won't be used for admin auth)
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
