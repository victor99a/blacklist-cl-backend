import { Router } from "express";
import db from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const userResult = await db.query(
      "SELECT username, display_name, avatar_url, bounty_score, tier, instagram, tiktok FROM users WHERE id = $1 LIMIT 1",
      [req.user.id],
    );
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: "No encontrado" });

    const vehiclesResult = await db.query(
      `SELECT id, name, make, model, slug, main_image_url, respect_count, power, year, specs_0_100, drivetrain
       FROM vehicles WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id],
    );

    res.json({
      user: {
        ...user,
        displayName: user.display_name,
        bountyScore: user.bounty_score,
      },
      vehicles: vehiclesResult.rows,
    });
  } catch (err) {
    console.error("Garage error:", err);
    res.status(500).json({ error: "Error" });
  }
});

export default router;
