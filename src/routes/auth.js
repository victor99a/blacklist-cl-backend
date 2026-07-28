import bcrypt from "bcryptjs";
import db from "../db.js";
import { generateToken } from "../middleware/auth.js";

export async function signup(req, res) {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }
    const existing = await db.query(
      "SELECT id FROM users WHERE username = $1 OR email = $2 LIMIT 1",
      [username, email],
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "El nombre de usuario o email ya existe" });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await db.query(
      `INSERT INTO users (username, email, password_hash, bounty_score, tier)
       VALUES ($1, $2, $3, 100, 'founder') RETURNING id, username, tier, bounty_score`,
      [username, email, passwordHash],
    );
    const user = result.rows[0];
    const token = generateToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Error al registrar" });
  }
}

export async function login(req, res) {
  try {
    const { username, password } = req.body;
    const result = await db.query(
      "SELECT id, username, password_hash, display_name, bounty_score, tier, avatar_url FROM users WHERE username = $1 LIMIT 1",
      [username],
    );
    const user = result.rows[0];
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: "Credenciales inv\u00E1lidas" });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Credenciales inv\u00E1lidas" });
    }
    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user.id, username: user.username,
        displayName: user.display_name, bountyScore: user.bounty_score,
        tier: user.tier, avatarUrl: user.avatar_url,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Error al iniciar sesi\u00F3n" });
  }
}

export async function me(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No autorizado" });
    const jwt = await import("jsonwebtoken");
    const decoded = jwt.default.verify(authHeader.split(" ")[1], process.env.JWT_SECRET || "dev-secret");
    const result = await db.query(
      "SELECT id, username, display_name, avatar_url, bounty_score, tier, city, instagram, tiktok FROM users WHERE id = $1 LIMIT 1",
      [decoded.id],
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json({
      ...user,
      displayName: user.display_name,
      bountyScore: user.bounty_score,
    });
  } catch {
    res.status(401).json({ error: "Token inv\u00E1lido" });
  }
}
