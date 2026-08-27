import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { db } from "../config/db.ts";

interface PostRow extends RowDataPacket {
  id: number;
  user_id: number;
  title: string;
  body: string;
  image_filename: string | null;
  created_at: Date;
  updated_at: Date;
  author_username: string;
}

const SELECT_POST =
  "SELECT p.id, p.user_id, p.title, p.body, p.image_filename, p.created_at, p.updated_at, u.username AS author_username FROM posts p JOIN users u ON u.id = p.user_id";

export async function getAllPosts(limit: number, offset: number) {
  const [rows] = await db.execute<PostRow[]>(
    `${SELECT_POST} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
    [limit, offset],
  );
  return rows;
}

export async function getPostById(id: number) {
  const [rows] = await db.execute<PostRow[]>(`${SELECT_POST} WHERE p.id = ?`, [id]);
  return rows[0] ?? null;
}

export async function createPost(userId: number, title: string, body: string) {
  const [result] = await db.execute<ResultSetHeader>(
    "INSERT INTO posts (user_id, title, body) VALUES (?, ?, ?)",
    [userId, title, body],
  );
  return getPostById(result.insertId);
}

export async function updatePost(id: number, title: string, body: string) {
  await db.execute("UPDATE posts SET title = ?, body = ? WHERE id = ?", [title, body, id]);
  return getPostById(id);
}

export async function deletePost(id: number) {
  const [result] = await db.execute<ResultSetHeader>("DELETE FROM posts WHERE id = ?", [id]);
  return result.affectedRows > 0;
}

export async function setPostImage(id: number, filename: string) {
  await db.execute("UPDATE posts SET image_filename = ? WHERE id = ?", [filename, id]);
  return getPostById(id);
}
