import { Router } from "express";
import db from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.post("/:vehicleId", authMiddleware, async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const userId = req.user.id;

    const existing = await db.query(
      "SELECT id FROM votes WHERE vehicle_id = $1 AND user_id = $2 LIMIT 1",
      [vehicleId, userId],
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Ya votaste este proyecto" });
    }

    const owner = await db.query(
      "SELECT user_id FROM vehicles WHERE id = $1 LIMIT 1",
      [vehicleId],
    );
    if (!owner.rows.length) return res.status(404).json({ error: "No encontrado" });
    if (owner.rows[0].user_id === userId) {
      return res.status(400).json({ error: "No puedes votar tu propio proyecto" });
    }

    await db.query(
      "INSERT INTO votes (vehicle_id, user_id) VALUES ($1, $2)",
      [vehicleId, userId],
    );
    await db.query(
      "UPDATE vehicles SET respect_count = respect_count + 1 WHERE id = $1",
      [vehicleId],
    );
    await db.query(
      "UPDATE users SET bounty_score = bounty_score + 5 WHERE id = $1",
      [owner.rows[0].user_id],
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Vote error:", err);
    res.status(500).json({ error: "Error al votar" });
  }
});

export default router;
