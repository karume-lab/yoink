CREATE TABLE `downloads` (
	`id` text PRIMARY KEY NOT NULL,
	`platform` text NOT NULL,
	`source_url` text NOT NULL,
	`author` text,
	`caption` text,
	`cover_url` text,
	`local_uri` text NOT NULL,
	`file_size` integer,
	`created_at` integer NOT NULL
);
