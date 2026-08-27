import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { db } from "../config/db.ts";

interface UserRow extends RowDataPacket {
  id: number;
  username: string;
  role: string;
  created_at: Date;
}

interface UserWithPasswordRow extends RowDataPacket {
  id: number;
  username: string;
  password_hash: string;
  role: string;
}

export async function register(username: string, password: string) {
  const [existing] = await db.execute<RowDataPacket[]>(
    "SELECT id FROM users WHERE username = ?",
    [username],
  );
  if (existing.length > 0) {
    return null;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [result] = await db.execute<ResultSetHeader>(
    "INSERT INTO users (username, password_hash) VALUES (?, ?)",
    [username, passwordHash],
  );

  return { id: result.insertId, username };
}

export async function login(username: string, password: string, privateKey: string) {
  const [rows] = await db.execute<UserWithPasswordRow[]>(
    "SELECT id, username, password_hash, role FROM users WHERE username = ?",
    [username],
  );
  const user = rows[0];
  if (!user) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    return null;
  }

  return jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    privateKey,
    { expiresIn: "1h" },
  );
}

export async function getUserById(id: number) {
  const [rows] = await db.execute<UserRow[]>(
    "SELECT id, username, role, created_at FROM users WHERE id = ?",
    [id],
  );
  return rows[0] ?? null;
}

export async function getAllUsers() {
  const [rows] = await db.execute<UserRow[]>(
    "SELECT id, username, role, created_at FROM users ORDER BY id",
  );
  return rows;
}
