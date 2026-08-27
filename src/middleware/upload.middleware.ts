import multer from "multer";
import { existsSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";

const UPLOAD_DIR = "uploads";

if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

export const uploadImage = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, callback) => {
      callback(null, `${randomUUID()}${extname(file.originalname)}`);
    },
  }),
  fileFilter: (req, file, callback) => {
    const mimetypeAllowed = ALLOWED_MIME_TYPES.includes(file.mimetype);
    const extensionAllowed =
      file.mimetype === "application/octet-stream" &&
      ALLOWED_EXTENSIONS.includes(extname(file.originalname).toLowerCase());

    callback(null, mimetypeAllowed || extensionAllowed);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});
