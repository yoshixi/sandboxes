import { desc, eq, and, gt } from "drizzle-orm";

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
  // Query: line messages by talkId and timestamp is greater than 24 hours ago
  return db
    .select({
      talkId: lineMessagesTable.talkId,
      userId: lineMessagesTable.lineUserId,
      role: lineMessagesTable.role,
      content: lineMessagesTable.content,
      createdAt: lineMessagesTable.createdAt,
    })
    .from(lineMessagesTable)
    .where(
      and(
        eq(lineMessagesTable.talkId, talkId),
        gt(
          lineMessagesTable.timestamp,
          new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
        )
      )
    )
    .orderBy(desc(lineMessagesTable.createdAt))
    .limit(limit);
}
