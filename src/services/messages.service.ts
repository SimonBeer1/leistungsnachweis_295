import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { db } from "../config/db.ts";

interface MessageRow extends RowDataPacket {
  id: number;
  sender_id: number;
  recipient_id: number;
  body: string;
  read_at: Date | null;
  created_at: Date;
}

async function getMessageById(id: number) {
  const [rows] = await db.execute<MessageRow[]>(
    "SELECT id, sender_id, recipient_id, body, read_at, created_at FROM messages WHERE id = ?",
    [id],
  );
  return rows[0] ?? null;
}

export async function sendMessage(senderId: number, recipientId: number, body: string) {
  const [recipientRows] = await db.execute<RowDataPacket[]>(
    "SELECT id FROM users WHERE id = ?",
    [recipientId],
  );
  if (recipientRows.length === 0) {
    return null;
  }

  const [result] = await db.execute<ResultSetHeader>(
    "INSERT INTO messages (sender_id, recipient_id, body) VALUES (?, ?, ?)",
    [senderId, recipientId, body],
  );
  return getMessageById(result.insertId);
}

export async function getConversation(userAId: number, userBId: number) {
  const [rows] = await db.execute<MessageRow[]>(
    "SELECT id, sender_id, recipient_id, body, read_at, created_at FROM messages WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?) ORDER BY created_at ASC",
    [userAId, userBId, userBId, userAId],
  );
  return rows;
}
