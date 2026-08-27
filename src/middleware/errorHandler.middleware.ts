import multer from "multer";
import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ message: "Datei ist zu gross (max. 5MB)" });
      return;
    }

    res.status(400).json({ message: "Fehler beim Datei-Upload" });
    return;
  }

  console.error(err);
  res.status(500).json({ message: "Interner Serverfehler" });
};
