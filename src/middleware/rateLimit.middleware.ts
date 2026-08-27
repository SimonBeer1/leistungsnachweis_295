import type { RequestHandler } from "express";

export function createRateLimitMiddleware(maxRequests = 5, windowMs = 60000): RequestHandler {
  const requestCounts = new Map<string, { count: number; windowStart: number }>();

  return (req, res, next) => {
    const ip = req.ip ?? "unknown";
    const now = Date.now();
    const entry = requestCounts.get(ip);

    if (!entry || now - entry.windowStart > windowMs) {
      requestCounts.set(ip, { count: 1, windowStart: now });
      next();
      return;
    }

    if (entry.count >= maxRequests) {
      const retryAfterSeconds = Math.ceil((entry.windowStart + windowMs - now) / 1000);
      res.set("Retry-After", String(retryAfterSeconds));
      res.status(429).json({ message: "Zu viele Anfragen, bitte später erneut versuchen" });
      return;
    }

    entry.count++;
    next();
  };
}
