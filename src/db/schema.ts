import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const downloads = sqliteTable("downloads", {
  id: text("id").primaryKey(),
  platform: text("platform").notNull(),
  sourceUrl: text("source_url").notNull(),
  author: text("author"),
  caption: text("caption"),
  coverUrl: text("cover_url"),
  localUri: text("local_uri").notNull(),
  fileSize: integer("file_size"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
