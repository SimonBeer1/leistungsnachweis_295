import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { Router } from "express";
import { z } from "zod";
import {
  getAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  setPostImage,
} from "../services/posts.service.ts";
import { createAuthMiddleware, type AuthRequest } from "../middleware/auth.middleware.ts";
import { uploadImage } from "../middleware/upload.middleware.ts";
import { usePrivateKey } from "../config/env.ts";

const createPostSchema = z
  .object({
    title: z.string().min(1).max(255),
    body: z.string().min(1),
  })
  .strict();

const updatePostSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    body: z.string().min(1).optional(),
  })
  .strict()
  .refine((data) => data.title !== undefined || data.body !== undefined, {
    message: "Mindestens ein Feld (title oder body) muss angegeben werden",
  });

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const idParamSchema = z.coerce.number().int().positive();

export function createPostsRouter() {
  const router = Router();
  const authMiddleware = createAuthMiddleware(usePrivateKey());

  /**
   * @swagger
   * /posts:
   *   get:
   *     summary: Alle Beiträge auflisten (paginiert)
   *     tags: [Posts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Maximale Anzahl an Beiträgen
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           minimum: 0
   *           default: 0
   *         description: Anzahl zu überspringender Beiträge
   *     responses:
   *       200:
   *         description: Liste der Beiträge
   *       400:
   *         description: Ungültige Pagination-Parameter
   *       401:
   *         description: Token fehlt, ist ungültig oder abgelaufen
   */
  router.get("/", authMiddleware, async (req, res) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ message: "Ungültige Eingabe", issues: parsed.error.issues });
      return;
    }

    const { limit, offset } = parsed.data;
    const posts = await getAllPosts(limit, offset);
    res.status(200).json(posts);
  });

  /**
   * @swagger
   * /posts/{id}:
   *   get:
   *     summary: Einzelnen Beitrag abrufen
   *     tags: [Posts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Der angeforderte Beitrag
   *       400:
   *         description: Ungültige ID
   *       401:
   *         description: Token fehlt, ist ungültig oder abgelaufen
   *       404:
   *         description: Beitrag nicht gefunden
   */
  router.get("/:id", authMiddleware, async (req, res) => {
    const parsedId = idParamSchema.safeParse(req.params.id);
    if (!parsedId.success) {
      res.status(400).json({ message: "Ungültige ID" });
      return;
    }

    const post = await getPostById(parsedId.data);
    if (!post) {
      res.status(404).json({ message: "Beitrag nicht gefunden" });
      return;
    }

    res.status(200).json(post);
  });

  /**
   * @swagger
   * /posts:
   *   post:
   *     summary: Neuen Beitrag erstellen
   *     tags: [Posts]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [title, body]
   *             properties:
   *               title:
   *                 type: string
   *                 minLength: 1
   *                 maxLength: 255
   *               body:
   *                 type: string
   *                 minLength: 1
   *     responses:
   *       201:
   *         description: Beitrag erfolgreich erstellt
   *       400:
   *         description: Ungültige Eingabe
   *       401:
   *         description: Token fehlt, ist ungültig oder abgelaufen
   */
  router.post("/", authMiddleware, async (req, res) => {
    const parsed = createPostSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Ungültige Eingabe", issues: parsed.error.issues });
      return;
    }

    const { userId } = (req as AuthRequest).user;
    const { title, body } = parsed.data;
    const post = await createPost(userId, title, body);
    res.status(201).json(post);
  });

  /**
   * @swagger
   * /posts/{id}:
   *   patch:
   *     summary: Beitrag aktualisieren (Titel und/oder Inhalt)
   *     tags: [Posts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             description: Mindestens eines der beiden Felder muss angegeben werden
   *             properties:
   *               title:
   *                 type: string
   *                 minLength: 1
   *                 maxLength: 255
   *               body:
   *                 type: string
   *                 minLength: 1
   *     responses:
   *       200:
   *         description: Aktualisierter Beitrag
   *       400:
   *         description: Ungültige ID oder ungültige Eingabe
   *       401:
   *         description: Token fehlt, ist ungültig oder abgelaufen
   *       403:
   *         description: Keine Berechtigung
   *       404:
   *         description: Beitrag nicht gefunden
   */
  router.patch("/:id", authMiddleware, async (req, res) => {
    const parsedId = idParamSchema.safeParse(req.params.id);
    if (!parsedId.success) {
      res.status(400).json({ message: "Ungültige ID" });
      return;
    }

    const parsedBody = updatePostSchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({ message: "Ungültige Eingabe", issues: parsedBody.error.issues });
      return;
    }

    const existingPost = await getPostById(parsedId.data);
    if (!existingPost) {
      res.status(404).json({ message: "Beitrag nicht gefunden" });
      return;
    }

    const { userId, role } = (req as AuthRequest).user;
    if (existingPost.user_id !== userId && role !== "admin") {
      res.status(403).json({ message: "Keine Berechtigung" });
      return;
    }

    const title = parsedBody.data.title ?? existingPost.title;
    const body = parsedBody.data.body ?? existingPost.body;
    const updatedPost = await updatePost(parsedId.data, title, body);
    res.status(200).json(updatedPost);
  });

  /**
   * @swagger
   * /posts/{id}:
   *   delete:
   *     summary: Beitrag löschen
   *     tags: [Posts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       204:
   *         description: Beitrag erfolgreich gelöscht
   *       400:
   *         description: Ungültige ID
   *       401:
   *         description: Token fehlt, ist ungültig oder abgelaufen
   *       403:
   *         description: Keine Berechtigung
   *       404:
   *         description: Beitrag nicht gefunden
   */
  router.delete("/:id", authMiddleware, async (req, res) => {
    const parsedId = idParamSchema.safeParse(req.params.id);
    if (!parsedId.success) {
      res.status(400).json({ message: "Ungültige ID" });
      return;
    }

    const existingPost = await getPostById(parsedId.data);
    if (!existingPost) {
      res.status(404).json({ message: "Beitrag nicht gefunden" });
      return;
    }

    const { userId, role } = (req as AuthRequest).user;
    if (existingPost.user_id !== userId && role !== "admin") {
      res.status(403).json({ message: "Keine Berechtigung" });
      return;
    }

    await deletePost(parsedId.data);
    res.status(204).send();
  });

  /**
   * @swagger
   * /posts/{id}/image:
   *   post:
   *     summary: Bild zu einem Beitrag hochladen
   *     tags: [Posts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required: [image]
   *             properties:
   *               image:
   *                 type: string
   *                 format: binary
   *     responses:
   *       200:
   *         description: Beitrag mit aktualisiertem Bild
   *       400:
   *         description: Ungültige ID oder kein gültiges Bild hochgeladen
   *       401:
   *         description: Token fehlt, ist ungültig oder abgelaufen
   *       403:
   *         description: Keine Berechtigung
   *       404:
   *         description: Beitrag nicht gefunden
   */
  router.post("/:id/image", authMiddleware, uploadImage.single("image"), async (req, res) => {
    const parsedId = idParamSchema.safeParse(req.params.id);
    if (!parsedId.success) {
      res.status(400).json({ message: "Ungültige ID" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "Kein gültiges Bild hochgeladen" });
      return;
    }
    const uploadedFile = req.file;

    const existingPost = await getPostById(parsedId.data);
    if (!existingPost) {
      res.status(404).json({ message: "Beitrag nicht gefunden" });
      return;
    }

    const { userId, role } = (req as AuthRequest).user;
    if (existingPost.user_id !== userId && role !== "admin") {
      res.status(403).json({ message: "Keine Berechtigung" });
      return;
    }

    if (existingPost.image_filename) {
      try {
        await unlink(join("uploads", existingPost.image_filename));
      } catch (error) {
        console.error("Konnte altes Bild nicht löschen:", error);
      }
    }

    const updatedPost = await setPostImage(parsedId.data, uploadedFile.filename);
    res.status(200).json(updatedPost);
  });

  return router;
}
