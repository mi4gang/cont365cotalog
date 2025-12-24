CREATE TABLE `admin_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(64) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`name` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp,
	CONSTRAINT `admin_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `container_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`containerId` int NOT NULL,
	`url` varchar(512) NOT NULL,
	`displayOrder` int NOT NULL DEFAULT 1,
	`isMain` boolean NOT NULL DEFAULT false,
	`originalName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `container_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `containers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`size` varchar(64) NOT NULL,
	`condition` enum('new','used') NOT NULL DEFAULT 'used',
	`price` decimal(12,2),
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `containers_id` PRIMARY KEY(`id`),
	CONSTRAINT `containers_externalId_unique` UNIQUE(`externalId`)
);
--> statement-breakpoint
CREATE TABLE `import_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminUserId` int,
	`filename` varchar(255),
	`containersProcessed` int DEFAULT 0,
	`containersAdded` int DEFAULT 0,
	`containersUpdated` int DEFAULT 0,
	`containersRemoved` int DEFAULT 0,
	`status` enum('pending','processing','completed','failed') DEFAULT 'pending',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `import_history_id` PRIMARY KEY(`id`)
);
