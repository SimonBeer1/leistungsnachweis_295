import { createPostSchema } from "./routes/posts.schemas.ts";

describe("createPostSchema", () => {
  it("rejects an empty title", () => {
    const result = createPostSchema.safeParse({ title: "", body: "Text" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid post", () => {
    const result = createPostSchema.safeParse({ title: "Titel", body: "Text" });
    expect(result.success).toBe(true);
  });
});
