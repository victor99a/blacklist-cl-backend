import { Router } from "express";
import multer from "multer";
import fs from "fs";
import sharp from "sharp";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const upload = multer({ dest: "uploads/", limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

const R2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET = process.env.R2_BUCKET || "blacklist-cl-uploads";
const PUBLIC_URL = process.env.R2_PUBLIC_URL || `https://${BUCKET}.r2.dev`;

function slugify(name) {
  return name.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No se encontr\u00F3 archivo" });

    // Compress with sharp
    const webpBuffer = await sharp(req.file.path)
      .resize(1200, 800, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const ext = "webp";
    const key = `vehicles/${slugify(req.file.originalname)}-${Date.now()}.${ext}`;

    await R2.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: webpBuffer,
      ContentType: `image/${ext}`,
      CacheControl: "public, max-age=31536000",
    }));

    fs.unlinkSync(req.file.path);

    res.json({ url: `${PUBLIC_URL}/${key}` });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Error al subir imagen" });
  }
});

export default router;
