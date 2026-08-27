import { Router } from "express";
import { z } from "zod";
import { createLink, getLinksByPostId } from "../services/links.service.ts";
import { getPostById } from "../services/posts.service.ts";
import { createAuthMiddleware } from "../middleware/auth.middleware.ts";
import { usePrivateKey } from "../config/env.ts";

const createLinkSchema = z
  .object({
    url: z.string().url(),
  })
  .strict();

const idParamSchema = z.coerce.number().int().positive();

export function createLinksRouter() {
  const router = Router();
  const authMiddleware = createAuthMiddleware(usePrivateKey());

  router.post("/posts/:id/links", authMiddleware, async (req, res) => {
    const parsedId = idParamSchema.safeParse(req.params.id);
    if (!parsedId.success) {
      res.status(400).json({ message: "Ungültige ID" });
      return;
    }

    const parsedBody = createLinkSchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({ message: "Ungültige Eingabe", issues: parsedBody.error.issues });
      return;
    }

    const post = await getPostById(parsedId.data);
    if (!post) {
      res.status(404).json({ message: "Beitrag nicht gefunden" });
      return;
    }

    const link = await createLink(parsedId.data, parsedBody.data.url);
    res.status(201).json(link);
  });

  router.get("/posts/:id/links", authMiddleware, async (req, res) => {
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

    const links = await getLinksByPostId(parsedId.data);
    res.status(200).json(links);
  });

  return router;
}
