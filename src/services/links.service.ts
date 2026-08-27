import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { db } from "../config/db.ts";

interface LinkRow extends RowDataPacket {
  id: number;
  post_id: number;
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  fetch_status: string;
  fetched_at: Date | null;
}

interface EnrichedData {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
}

export async function enrichUrl(url: string): Promise<EnrichedData | null> {
  try {
    const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as any;
    if (data.status !== "success") {
      return null;
    }

    return {
      title: data.data.title ?? null,
      description: data.data.description ?? null,
      imageUrl: data.data.image?.url ?? null,
    };
  } catch {
    return null;
  }
}

export async function retryLink(id: number, url: string) {
  const enriched = await enrichUrl(url);

  if (enriched) {
    await db.execute(
      "UPDATE links SET title = ?, description = ?, image_url = ?, fetch_status = 'ok', fetched_at = NOW() WHERE id = ?",
      [enriched.title, enriched.description, enriched.imageUrl, id],
    );
  } else {
    await db.execute("UPDATE links SET fetch_status = 'failed', fetched_at = NOW() WHERE id = ?", [id]);
  }

  return getLinkById(id);
}

export async function createLink(postId: number, url: string) {
  const [result] = await db.execute<ResultSetHeader>(
    "INSERT INTO links (post_id, url, fetch_status) VALUES (?, ?, 'pending')",
    [postId, url],
  );

  return retryLink(result.insertId, url);
}

export async function getLinkById(id: number) {
  const [rows] = await db.execute<LinkRow[]>("SELECT * FROM links WHERE id = ?", [id]);
  return rows[0] ?? null;
}

export async function getLinksByPostId(postId: number) {
  const [rows] = await db.execute<LinkRow[]>(
    "SELECT * FROM links WHERE post_id = ? ORDER BY id ASC",
    [postId],
  );
  return rows;
}

export async function getFailedLinks() {
  const [rows] = await db.execute<LinkRow[]>("SELECT * FROM links WHERE fetch_status = 'failed'");
  return rows;
}
