CREATE TABLE `line_messages` (
	`id` integer PRIMARY KEY NOT NULL,
	`talk_id` text NOT NULL,
	`line_user_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`timestamp` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
