import { desc, eq, getTableColumns, gt, sql } from "drizzle-orm";

import { db } from "../index.js";
import {
  InsertLineMessage,
  lineMessagesTable,
  SelectLineMessage,
} from "../schema.js";
export { InsertLineMessage };

export async function createLineMessages(data: InsertLineMessage[]) {
  return await db.insert(lineMessagesTable).values(data);
}
export async function getLineMessageByTalkId(
  talkId: SelectLineMessage["talkId"],
  limit: number
): Promise<Array<{
  userId: string;
  talkId: string;
  content: string;
  role: string;
  createdAt: Date | null;
}> | null> {
  return db
    .select({
      talkId: lineMessagesTable.talkId,
      userId: lineMessagesTable.lineUserId,
      role: lineMessagesTable.role,
      content: lineMessagesTable.content,
      createdAt: lineMessagesTable.createdAt,
    })
    .from(lineMessagesTable)
    .where(eq(lineMessagesTable.talkId, talkId))
    .orderBy(desc(lineMessagesTable.createdAt))
    .limit(limit);
}
