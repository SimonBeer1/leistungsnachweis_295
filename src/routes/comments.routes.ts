import { Router } from "express";
import { z } from "zod";
import {
  getCommentsByPostId,
  getCommentById,
  createComment,
  deleteComment,
} from "../services/comments.service.ts";
import { getPostById } from "../services/posts.service.ts";
import { createAuthMiddleware, type AuthRequest } from "../middleware/auth.middleware.ts";
import { usePrivateKey } from "../config/env.ts";

const createCommentSchema = z
  .object({
    body: z.string().min(1),
  })
  .strict();

const idParamSchema = z.coerce.number().int().positive();

export function createCommentsRouter() {
  const router = Router();
  const authMiddleware = createAuthMiddleware(usePrivateKey());

  router.get("/posts/:id/comments", authMiddleware, async (req, res) => {
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

    const comments = await getCommentsByPostId(parsedId.data);
    res.status(200).json(comments);
  });

  router.post("/posts/:id/comments", authMiddleware, async (req, res) => {
    const parsedId = idParamSchema.safeParse(req.params.id);
    if (!parsedId.success) {
      res.status(400).json({ message: "Ungültige ID" });
      return;
    }

    const parsedBody = createCommentSchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({ message: "Ungültige Eingabe", issues: parsedBody.error.issues });
      return;
    }

    const post = await getPostById(parsedId.data);
    if (!post) {
      res.status(404).json({ message: "Beitrag nicht gefunden" });
      return;
    }

    const { userId } = (req as AuthRequest).user;
    const comment = await createComment(parsedId.data, userId, parsedBody.data.body);
    res.status(201).json(comment);
  });

  router.delete("/comments/:id", authMiddleware, async (req, res) => {
    const parsedId = idParamSchema.safeParse(req.params.id);
    if (!parsedId.success) {
      res.status(400).json({ message: "Ungültige ID" });
      return;
    }

    const comment = await getCommentById(parsedId.data);
    if (!comment) {
      res.status(404).json({ message: "Kommentar nicht gefunden" });
      return;
    }

    const { userId, role } = (req as AuthRequest).user;
    if (comment.user_id !== userId && comment.post_owner_id !== userId && role !== "admin") {
      res.status(403).json({ message: "Keine Berechtigung" });
      return;
    }

    await deleteComment(parsedId.data);
    res.status(204).send();
  });

  return router;
}
