import { Router } from "express";
import { z } from "zod";
import { register, login, getUserById } from "../services/auth.service.ts";
import { createAuthMiddleware, type AuthRequest } from "../middleware/auth.middleware.ts";
import { createRateLimitMiddleware } from "../middleware/rateLimit.middleware.ts";
import { usePrivateKey } from "../config/env.ts";

const credentialsSchema = z
  .object({
    username: z.string().min(3).max(50),
    password: z.string().min(8),
  })
  .strict();

export function createAuthRouter() {
  const router = Router();
  const privateKey = usePrivateKey();
  const authMiddleware = createAuthMiddleware(privateKey);
  const loginRateLimit = createRateLimitMiddleware();

  router.post("/register", async (req, res) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Ungültige Eingabe", issues: parsed.error.issues });
      return;
    }

    const { username, password } = parsed.data;
    const user = await register(username, password);
    if (!user) {
      res.status(409).json({ message: "Benutzername ist bereits vergeben" });
      return;
    }

    res.status(201).json(user);
  });

  router.post("/login", loginRateLimit, async (req, res) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Ungültige Eingabe", issues: parsed.error.issues });
      return;
    }

    const { username, password } = parsed.data;
    const token = await login(username, password, privateKey);
    if (!token) {
      res.status(401).json({ message: "Benutzername oder Passwort ist falsch" });
      return;
    }

    res.status(200).json({ token });
  });

  router.get("/me", authMiddleware, async (req, res) => {
    const { userId } = (req as AuthRequest).user;
    const user = await getUserById(userId);
    if (!user) {
      res.status(404).json({ message: "Benutzer nicht gefunden" });
      return;
    }

    res.status(200).json(user);
  });

  return router;
}
