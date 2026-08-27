import express from "express";
import { createAuthRouter } from "./routes/auth.routes.ts";
import { createUsersRouter } from "./routes/users.routes.ts";
import { createPostsRouter } from "./routes/posts.routes.ts";
import { createCommentsRouter } from "./routes/comments.routes.ts";

export function createApp() {
  const app = express();

  app.use(express.json());

  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", createAuthRouter());
  app.use("/users", createUsersRouter());
  app.use("/posts", createPostsRouter());
  app.use("/", createCommentsRouter());

  return app;
}
