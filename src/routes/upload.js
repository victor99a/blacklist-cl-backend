import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import sharp from "sharp";

const UPLOADS_DIR = "/app/uploads";

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const name = (file.originalname || "image")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30);
    cb(null, `vehicle-${name}-${Date.now()}.webp`);
  },
});

const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });
const router = Router();

router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No se encontr\u00F3 archivo" });
    const originalPath = req.file.path;
    const tempPath = originalPath.replace(/\.webp$/, "-tmp" + path.extname(req.file.originalname || ".jpg"));

    // Rename to temp to let sharp read the original format
    fs.renameSync(originalPath, tempPath);

    await sharp(tempPath)
      .resize(1200, 800, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(originalPath);

    fs.unlinkSync(tempPath);

    const filename = path.basename(originalPath);
    console.log("[Upload] Saved:", filename);
    const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : `http://localhost:${process.env.PORT || 3001}`;
    res.json({ url: `${baseUrl}/uploads/${filename}` });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Error al subir imagen" });
  }
});

export default router;
