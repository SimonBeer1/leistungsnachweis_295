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

  /**
   * @swagger
   * /auth/register:
   *   post:
   *     summary: Neuen Benutzer registrieren
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [username, password]
   *             properties:
   *               username:
   *                 type: string
   *                 minLength: 3
   *                 maxLength: 50
   *               password:
   *                 type: string
   *                 minLength: 8
   *     responses:
   *       201:
   *         description: Benutzer erfolgreich erstellt
   *       400:
   *         description: Ungültige Eingabe
   *       409:
   *         description: Benutzername ist bereits vergeben
   */
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

  /**
   * @swagger
   * /auth/login:
   *   post:
   *     summary: Anmelden und JWT-Token erhalten
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [username, password]
   *             properties:
   *               username:
   *                 type: string
   *                 minLength: 3
   *                 maxLength: 50
   *               password:
   *                 type: string
   *                 minLength: 8
   *     responses:
   *       200:
   *         description: Login erfolgreich, Token wird zurückgegeben
   *       400:
   *         description: Ungültige Eingabe
   *       401:
   *         description: Benutzername oder Passwort ist falsch
   *       429:
   *         description: Zu viele Anfragen (Rate-Limit überschritten)
   */
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

  /**
   * @swagger
   * /auth/me:
   *   get:
   *     summary: Eigene Benutzerdaten abrufen
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Benutzerdaten des angemeldeten Benutzers
   *       401:
   *         description: Token fehlt, ist ungültig oder abgelaufen
   *       404:
   *         description: Benutzer nicht gefunden
   */
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
