import { Router } from "express";
import { z } from "zod";
import {
  getAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
} from "../services/posts.service.ts";
import { createAuthMiddleware, type AuthRequest } from "../middleware/auth.middleware.ts";
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

  return router;
}
