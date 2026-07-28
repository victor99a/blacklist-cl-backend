import { Router } from "express";
import { prisma } from "../prisma.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// GET /api/vehicles — Top 3 public
router.get("/", async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { isPublished: true },
      orderBy: { respectCount: "desc" },
      take: 3,
      include: {
        user: { select: { username: true, displayName: true, bountyScore: true } },
        modifications: {
          select: { id: true, category: true, title: true, brand: true, workshop: { select: { name: true, isVerified: true } } },
        },
        _count: { select: { votes: true } },
      },
    });

    const topVehicles = vehicles.map((v, i) => {
      const uniqueCats = new Set(v.modifications.map((m) => m.category)).size;
      const tags = [];
      if (v.modifications.some((m) => m.workshop?.isVerified)) tags.push("VERIFIED WORKSHOP");
      if (v.modifications.some((m) => m.category === "engine" && (m.title.toLowerCase().includes("turbo") || m.title.toLowerCase().includes("nos")))) tags.push("NOS READY");
      if (uniqueCats >= 3) tags.push("STAGE 2");

      return {
        rank: i + 1, name: v.name, pilot: `@${v.user.username}`,
        vehicle: `${v.make} ${v.model}`, city: v.city ?? "",
        power: v.power ?? null,
        specs0_100: v.specs0_100 ?? null,
        drivetrain: v.drivetrain ?? null,
        modsCount: v.modifications.length,
        respect: v.respectCount,
        bounty: v.user.bountyScore, tags, id: v.id, slug: v.slug,
      };
    });

    res.json(topVehicles);
  } catch (err) {
    console.error("Error fetching vehicles:", err);
    res.status(500).json({ error: "Error al cargar veh\u00EDculos" });
  }
});

// GET /api/vehicles/:slug — Single vehicle detail
router.get("/:slug", async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { slug: req.params.slug },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true, bountyScore: true, city: true, instagram: true, tiktok: true } },
        modifications: {
          include: { workshop: { select: { name: true, isVerified: true } } },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { votes: true } },
      },
    });
    if (!vehicle || !vehicle.isPublished) {
      return res.status(404).json({ error: "No encontrado" });
    }
    res.json(vehicle);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error" });
  }
});

// POST /api/vehicles — Create vehicle (auth)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, make, model, year, power, specs0_100, drivetrain, city, mainImageUrl, description, instagram, tiktok, modifications, workshop } = req.body;

    const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) + "-" + req.user.id.slice(0, 6);

    let workshopId = null;
    if (workshop?.name) {
      const existing = await prisma.workshop.findFirst({
        where: { name: { equals: workshop.name, mode: "insensitive" } },
      });
      if (existing) {
        workshopId = existing.id;
      } else {
        const created = await prisma.workshop.create({
          data: { name: workshop.name, slug: workshop.name.toLowerCase().replace(/\s+/g, "-"), cityRegion: workshop.cityRegion || "Santiago", instagram: workshop.instagram },
        });
        workshopId = created.id;
      }
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        userId: req.user.id, name, make, model, year: year ? parseInt(year) : null,
        slug, power: power ? parseInt(power) : null,
        specs0_100: specs0_100 || null, drivetrain: drivetrain || null,
        city, mainImageUrl, description,
        isPublished: true,
        modifications: modifications?.length
          ? { create: modifications.map((m) => ({ category: m.category, title: m.title, brand: m.brand || null, workshopId })) }
          : undefined,
      },
    });

    // +50 bounty
    await prisma.user.update({ where: { id: req.user.id }, data: { bountyScore: { increment: 50 } } });
    await prisma.bountyLog.create({ data: { profileId: req.user.id, amount: 50, action: "publish_vehicle", referenceId: vehicle.id } });

    res.status(201).json({ success: true, slug: vehicle.slug });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear veh\u00EDculo" });
  }
});

export default router;
