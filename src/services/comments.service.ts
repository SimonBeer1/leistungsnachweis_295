import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { db } from "../config/db.ts";

interface CommentRow extends RowDataPacket {
  id: number;
  post_id: number;
  user_id: number;
  body: string;
  created_at: Date;
  author_username: string;
}

interface CommentWithPostOwnerRow extends RowDataPacket {
  id: number;
  post_id: number;
  user_id: number;
  body: string;
  created_at: Date;
  author_username: string;
  post_owner_id: number;
}

const COMMENT_JOIN = "FROM comments c JOIN users u ON u.id = c.user_id";

export async function getCommentsByPostId(postId: number) {
  const [rows] = await db.execute<CommentRow[]>(
    `SELECT c.id, c.post_id, c.user_id, c.body, c.created_at, u.username AS author_username ${COMMENT_JOIN} WHERE c.post_id = ? ORDER BY c.created_at ASC`,
    [postId],
  );
  return rows;
}

export async function getCommentById(id: number) {
  const [rows] = await db.execute<CommentWithPostOwnerRow[]>(
    `SELECT c.id, c.post_id, c.user_id, c.body, c.created_at, u.username AS author_username, p.user_id AS post_owner_id ${COMMENT_JOIN} JOIN posts p ON p.id = c.post_id WHERE c.id = ?`,
    [id],
  );
  return rows[0] ?? null;
}

export async function createComment(postId: number, userId: number, body: string) {
  const [result] = await db.execute<ResultSetHeader>(
    "INSERT INTO comments (post_id, user_id, body) VALUES (?, ?, ?)",
    [postId, userId, body],
  );
  return getCommentById(result.insertId);
}

export async function deleteComment(id: number) {
  const [result] = await db.execute<ResultSetHeader>("DELETE FROM comments WHERE id = ?", [id]);
  return result.affectedRows > 0;
}
