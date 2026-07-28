import { Router } from "express";
import { prisma } from "../prisma.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// POST /api/vote/:vehicleId
router.post("/:vehicleId", authMiddleware, async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const userId = req.user.id;

    const existing = await prisma.vote.findUnique({
      where: { vehicleId_userId: { vehicleId, userId } },
    });
    if (existing) return res.status(409).json({ error: "Ya votaste este proyecto" });

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { userId: true },
    });
    if (!vehicle) return res.status(404).json({ error: "No encontrado" });
    if (vehicle.userId === userId) return res.status(400).json({ error: "No puedes votar tu propio proyecto" });

    await prisma.vote.create({ data: { vehicleId, userId } });
    await prisma.vehicle.update({ where: { id: vehicleId }, data: { respectCount: { increment: 1 } } });
    await prisma.user.update({ where: { id: vehicle.userId }, data: { bountyScore: { increment: 5 } } });
    await prisma.bountyLog.create({ data: { profileId: vehicle.userId, amount: 5, action: "receive_respect", referenceId: vehicleId } });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al votar" });
  }
});

export default router;
