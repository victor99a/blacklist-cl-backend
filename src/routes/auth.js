import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma.js";
import { generateToken } from "../middleware/auth.js";

const router = Router();

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existing) {
      return res.status(409).json({ error: "El nombre de usuario o email ya existe" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { username, email, passwordHash, bountyScore: 100, tier: "founder" },
    });

    const token = generateToken(user);
    res.status(201).json({
      token,
      user: { id: user.id, username: user.username, tier: user.tier, bountyScore: user.bountyScore },
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Error al registrar" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Credenciales inv\u00E1lidas" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Credenciales inv\u00E1lidas" });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user.id, username: user.username, displayName: user.displayName,
        bountyScore: user.bountyScore, tier: user.tier, avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Error al iniciar sesi\u00F3n" });
  }
});

// GET /api/auth/me
router.get("/me", async (req, res) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No autorizado" });
  try {
    const jwt = await import("jsonwebtoken");
    const decoded = jwt.default.verify(header.split(" ")[1], process.env.JWT_SECRET || "dev-secret");
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, displayName: true, avatarUrl: true, bountyScore: true, tier: true, city: true, instagram: true, tiktok: true },
    });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(user);
  } catch {
    res.status(401).json({ error: "Token inv\u00E1lido" });
  }
});

export default router;
