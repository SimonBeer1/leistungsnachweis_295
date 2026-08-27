import { Router } from "express";
import { getAllUsers } from "../services/auth.service.ts";
import { createAuthMiddleware } from "../middleware/auth.middleware.ts";
import { usePrivateKey } from "../config/env.ts";

export function createUsersRouter() {
  const router = Router();
  const authMiddleware = createAuthMiddleware(usePrivateKey());

  /**
   * @swagger
   * /users:
   *   get:
   *     summary: Alle Benutzer auflisten
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Liste aller Benutzer
   *       401:
   *         description: Token fehlt, ist ungültig oder abgelaufen
   */
  router.get("/", authMiddleware, async (req, res) => {
    const users = await getAllUsers();
    res.status(200).json(users);
  });

  return router;
}
