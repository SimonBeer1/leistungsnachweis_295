import express from "express";
import { createAuthRouter } from "./routes/auth.routes.ts";
import { createUsersRouter } from "./routes/users.routes.ts";
import { createPostsRouter } from "./routes/posts.routes.ts";
import { createCommentsRouter } from "./routes/comments.routes.ts";
import { createLinksRouter } from "./routes/links.routes.ts";
import { createMessagesRouter } from "./routes/messages.routes.ts";
import { errorHandler } from "./middleware/errorHandler.middleware.ts";

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use("/uploads", express.static("uploads"));

  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", createAuthRouter());
  app.use("/users", createUsersRouter());
  app.use("/posts", createPostsRouter());
  app.use("/", createCommentsRouter());
  app.use("/", createLinksRouter());
  app.use("/messages", createMessagesRouter());

  app.use(errorHandler);

  return app;
}
