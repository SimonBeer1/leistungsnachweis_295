import { Router } from "express";
import { z } from "zod";
import { sendMessage, getConversation } from "../services/messages.service.ts";
import { createAuthMiddleware, type AuthRequest } from "../middleware/auth.middleware.ts";
import { usePrivateKey } from "../config/env.ts";

const sendMessageSchema = z
  .object({
    recipientId: z.coerce.number().int().positive(),
    body: z.string().min(1),
  })
  .strict();

const idParamSchema = z.coerce.number().int().positive();

export function createMessagesRouter() {
  const router = Router();
  const authMiddleware = createAuthMiddleware(usePrivateKey());

  router.post("/", authMiddleware, async (req, res) => {
    const parsed = sendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Ungültige Eingabe", issues: parsed.error.issues });
      return;
    }

    const { userId } = (req as AuthRequest).user;
    const { recipientId, body } = parsed.data;

    if (recipientId === userId) {
      res.status(400).json({ message: "Du kannst dir nicht selbst schreiben" });
      return;
    }

    const message = await sendMessage(userId, recipientId, body);
    if (!message) {
      res.status(404).json({ message: "Empfänger nicht gefunden" });
      return;
    }

    res.status(201).json(message);
  });

  router.get("/:userId", authMiddleware, async (req, res) => {
    const parsedUserId = idParamSchema.safeParse(req.params.userId);
    if (!parsedUserId.success) {
      res.status(400).json({ message: "Ungültige ID" });
      return;
    }

    const { userId } = (req as AuthRequest).user;
    const conversation = await getConversation(userId, parsedUserId.data);
    res.status(200).json(conversation);
  });

  return router;
}
