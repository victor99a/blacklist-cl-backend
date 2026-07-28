import { Router } from "express";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import fs from "fs";

const upload = multer({ dest: "uploads/", limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No se encontr\u00F3 archivo" });
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "blacklist/vehicles",
      format: "webp",
      transformation: [{ width: 1200, height: 800, crop: "limit", quality: "auto:best" }],
    });
    fs.unlinkSync(req.file.path);
    res.json({ url: result.secure_url });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Error al subir imagen" });
  }
});

export default router;
