CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`profileId` text NOT NULL,
	`iconUrl` text,
	`displayName` text NOT NULL,
	`createdAt` integer NOT NULL
);
