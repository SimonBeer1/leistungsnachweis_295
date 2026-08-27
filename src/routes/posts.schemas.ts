import { z } from "zod";

export const createPostSchema = z
  .object({
    title: z.string().min(1).max(255),
    body: z.string().min(1),
  })
  .strict();

export const updatePostSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    body: z.string().min(1).optional(),
  })
  .strict()
  .refine((data) => data.title !== undefined || data.body !== undefined, {
    message: "Mindestens ein Feld (title oder body) muss angegeben werden",
  });
