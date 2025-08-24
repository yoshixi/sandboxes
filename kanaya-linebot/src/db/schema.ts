import { sql } from "drizzle-orm";
import { line } from "drizzle-orm/pg-core";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const lineMessagesTable = sqliteTable("line_messages", {
  id: integer("id").primaryKey(),
  talkId: text("talk_id").notNull(), // userId or groupId or roomId
  lineUserId: text("line_user_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$default(
    () => new Date()
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$onUpdate(
    () => new Date()
  ),
});

export type InsertLineMessage = typeof lineMessagesTable.$inferInsert;
export type SelectLineMessage = typeof lineMessagesTable.$inferSelect;
