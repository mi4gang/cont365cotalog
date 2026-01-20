-- Production MySQL Database Initialization Script
-- Execute this script ONCE in phpMyAdmin to set up the database schema and admin user

-- Drop existing tables if they exist (optional - remove these lines if you want to keep existing data)
-- DROP TABLE IF EXISTS `container_photos`;
-- DROP TABLE IF EXISTS `import_history`;
-- DROP TABLE IF EXISTS `containers`;
-- DROP TABLE IF EXISTS `admin_users`;
-- DROP TABLE IF EXISTS `users`;

-- Create users table (for Manus OAuth compatibility)
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT NOT NULL,
    `openId` VARCHAR(64) NOT NULL,
    `name` TEXT,
    `email` VARCHAR(320),
    `loginMethod` VARCHAR(64),
    `role` ENUM('user','admin') NOT NULL DEFAULT 'user',
    `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `lastSignedIn` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `users_openId_unique` (`openId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create admin_users table for local admin authentication
CREATE TABLE IF NOT EXISTS `admin_users` (
    `id` INT AUTO_INCREMENT NOT NULL,
    `username` VARCHAR(64) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `name` VARCHAR(128),
    `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `lastSignedIn` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `admin_users_username_unique` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create containers table
CREATE TABLE IF NOT EXISTS `containers` (
    `id` INT AUTO_INCREMENT NOT NULL,
    `externalId` VARCHAR(64) NOT NULL,
    `name` VARCHAR(128) NOT NULL,
    `size` VARCHAR(64) NOT NULL,
    `condition` ENUM('new','used') NOT NULL DEFAULT 'used',
    `price` DECIMAL(12,2) NOT NULL,
    `description` TEXT,
    `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
    `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `containers_externalId_unique` (`externalId`),
    KEY `idx_containers_isActive` (`isActive`),
    KEY `idx_containers_size` (`size`),
    KEY `idx_containers_condition` (`condition`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create container_photos table
CREATE TABLE IF NOT EXISTS `container_photos` (
    `id` INT AUTO_INCREMENT NOT NULL,
    `containerId` INT NOT NULL,
    `url` VARCHAR(512) NOT NULL,
    `displayOrder` INT NOT NULL DEFAULT 1,
    `isMain` BOOLEAN NOT NULL DEFAULT FALSE,
    `originalName` VARCHAR(255),
    `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_container_photos_containerId` (`containerId`),
    CONSTRAINT `fk_container_photos_containerId` FOREIGN KEY (`containerId`) REFERENCES `containers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create import_history table
CREATE TABLE IF NOT EXISTS `import_history` (
    `id` INT AUTO_INCREMENT NOT NULL,
    `adminUserId` INT,
    `filename` VARCHAR(255),
    `containersProcessed` INT DEFAULT 0,
    `containersAdded` INT DEFAULT 0,
    `containersUpdated` INT DEFAULT 0,
    `containersRemoved` INT DEFAULT 0,
    `status` ENUM('pending','processing','completed','failed') DEFAULT 'pending',
    `errorMessage` TEXT,
    `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `completedAt` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_import_history_adminUserId` (`adminUserId`),
    KEY `idx_import_history_status` (`status`),
    CONSTRAINT `fk_import_history_adminUserId` FOREIGN KEY (`adminUserId`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin user (username: admin, password: admin123)
-- Password hash generated with bcrypt (10 rounds)
INSERT INTO `admin_users` (`username`, `passwordHash`, `name`) 
VALUES ('admin', '$2b$10$IIxcaNH7qQ8QndUBXcR1luo2UpZnCAZ5Key3bV.hwnflExpaomv6q', 'Administrator')
ON DUPLICATE KEY UPDATE `username` = `username`;

-- Verify tables were created
SELECT 'Database initialization completed successfully!' AS Status;
SELECT COUNT(*) AS admin_users_count FROM `admin_users`;
