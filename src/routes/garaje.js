import { Router } from "express";
import { prisma } from "../prisma.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// GET /api/garaje — User's garage
router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { username: true, displayName: true, avatarUrl: true, bountyScore: true, tier: true, instagram: true, tiktok: true },
    });
    const vehicles = await prisma.vehicle.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, make: true, model: true, slug: true, mainImageUrl: true, respectCount: true, power: true, year: true, specs0_100: true, drivetrain: true },
    });
    res.json({ user, vehicles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error" });
  }
});

export default router;
