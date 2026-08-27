import jwt from "jsonwebtoken";
import type { Request, RequestHandler } from "express";

export interface AuthRequest extends Request {
  user: {
    userId: number;
    username: string;
    role: string;
  };
}

export function createAuthMiddleware(privateKey: string): RequestHandler {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Token fehlt oder ist ungültig" });
      return;
    }

    const token = authHeader.slice("Bearer ".length);

    try {
      const payload = jwt.verify(token, privateKey) as {
        userId: number;
        username: string;
        role: string;
      };
      (req as AuthRequest).user = payload;
      next();
    } catch {
      res.status(401).json({ message: "Token ungültig oder abgelaufen" });
    }
  };
}
