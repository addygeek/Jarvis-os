import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { Router } from "express";
import multer from "multer";
import { appConfig } from "../config.js";
import { asyncHandler } from "../middleware/error-handler.js";

function sanitizeFilename(name: string): string {
  const base = name.replace(/[^\w.\-() ]+/g, "_").trim();
  return base.length > 0 ? base.slice(0, 200) : "upload";
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      mkdirSync(appConfig.uploadsDir, { recursive: true });
      cb(null, appConfig.uploadsDir);
    },
    filename: (_req, file, cb) => {
      cb(null, `${randomUUID()}-${sanitizeFilename(file.originalname)}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024, files: 20 },
});

const router = Router();

/** POST /api/files/upload — multipart field `files` (one or more). */
router.post(
  "/upload",
  upload.array("files"),
  asyncHandler(async (req, res) => {
    const files = Array.isArray(req.files) ? req.files : [];

    const results = files.map((f) => ({
      name: f.originalname,
      path: f.path,
      size: f.size,
    }));

    res.status(201).json({ files: results, count: results.length });
  }),
);

export { router as filesRouter };
export default router;
