import db from "../db.js";
import { authMiddleware } from "../middleware/auth.js";
import { Router } from "express";

const router = Router();

// GET /api/vehicles — Top 3 public
router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        v.id, v.name, v.make, v.model, v.slug, v.power, v.city,
        v.respect_count, v.specs_0_100, v.drivetrain,
        u.username, u.bounty_score AS user_bounty,
        COALESCE(json_agg(
          json_build_object('id', m.id, 'category', m.category, 'title', m.title, 'brand', m.brand,
            'workshop', CASE WHEN w.id IS NOT NULL THEN json_build_object('name', w.name, 'is_verified', w.is_verified) ELSE NULL END)
        ) FILTER (WHERE m.id IS NOT NULL), '[]') AS modifications
      FROM vehicles v
      JOIN users u ON u.id = v.user_id
      LEFT JOIN modifications m ON m.vehicle_id = v.id
      LEFT JOIN workshops w ON w.id = m.workshop_id
      WHERE v.is_published = true
      GROUP BY v.id, u.username, u.bounty_score
      ORDER BY v.respect_count DESC
      LIMIT 3
    `);

    const vehicles = result.rows.map((v, i) => {
      const mods = v.modifications || [];
      const uniqueCats = new Set(mods.map(m => m.category)).size;
      const tags = [];
      if (mods.some(m => m.workshop?.is_verified)) tags.push("VERIFIED WORKSHOP");
      if (mods.some(m => m.category === "engine" && (m.title?.toLowerCase().includes("turbo") || m.title?.toLowerCase().includes("nos")))) tags.push("NOS READY");
      if (uniqueCats >= 3) tags.push("STAGE 2");
      return {
        rank: i + 1, name: v.name, pilot: `@${v.username}`,
        vehicle: `${v.make} ${v.model}`, city: v.city || "",
        power: v.power, specs0_100: v.specs_0_100, drivetrain: v.drivetrain,
        modsCount: mods.length, respect: v.respect_count,
        bounty: v.user_bounty, tags, id: v.id, slug: v.slug,
      };
    });

    res.json(vehicles);
  } catch (err) {
    console.error("Error fetching vehicles:", err);
    res.status(500).json({ error: "Error al cargar veh\u00EDculos" });
  }
});

// GET /api/vehicles/:slug — Single vehicle detail
router.get("/:slug", async (req, res) => {
  try {
    const vResult = await db.query(`
      SELECT v.*, u.id AS owner_id, u.username, u.display_name, u.avatar_url,
        u.bounty_score, u.city AS owner_city, u.instagram, u.tiktok,
        (SELECT COUNT(*) FROM votes WHERE vehicle_id = v.id) AS vote_count
      FROM vehicles v
      JOIN users u ON u.id = v.user_id
      WHERE v.slug = $1 AND v.is_published = true
      LIMIT 1
    `, [req.params.slug]);

    const vehicle = vResult.rows[0];
    if (!vehicle) return res.status(404).json({ error: "No encontrado" });

    const modsResult = await db.query(`
      SELECT m.*, json_build_object('name', w.name, 'is_verified', w.is_verified) AS workshop
      FROM modifications m
      LEFT JOIN workshops w ON w.id = m.workshop_id
      WHERE m.vehicle_id = $1
      ORDER BY m.created_at ASC
    `, [vehicle.id]);

    res.json({
      id: vehicle.id, name: vehicle.name, make: vehicle.make,
      model: vehicle.model, year: vehicle.year, slug: vehicle.slug,
      mainImageUrl: vehicle.main_image_url, galleryUrls: vehicle.gallery_urls || [], description: vehicle.description,
      power: vehicle.power, specs0_100: vehicle.specs_0_100,
      drivetrain: vehicle.drivetrain, city: vehicle.city,
      isPublished: vehicle.is_published, respectCount: vehicle.respect_count,
      instagram: vehicle.instagram, tiktok: vehicle.tiktok,
      user: {
        id: vehicle.owner_id, username: vehicle.username,
        displayName: vehicle.display_name, avatarUrl: vehicle.avatar_url,
        bountyScore: vehicle.bounty_score, city: vehicle.owner_city,
        instagram: vehicle.instagram, tiktok: vehicle.tiktok,
      },
      modifications: modsResult.rows,
      _count: { votes: parseInt(vehicle.vote_count) },
    });
  } catch (err) {
    console.error("Error fetching vehicle:", err);
    res.status(500).json({ error: "Error" });
  }
});

// POST /api/vehicles — Create vehicle (auth)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, make, model, year, power, specs0_100, drivetrain,
      city, mainImageUrl, galleryUrls, description, instagram, tiktok, modifications } = req.body;

    const slug = name.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80)
      + "-" + req.user.id.slice(0, 6);

    const vResult = await db.query(`
      INSERT INTO vehicles (user_id, name, make, model, year, slug, power,
        specs_0_100, drivetrain, city, main_image_url, gallery_urls, description, is_published)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
      RETURNING id, slug
    `, [req.user.id, name, make, model, year || null, slug,
        power || null, specs0_100 || null, drivetrain || null,
        city || "Santiago", mainImageUrl || null,
        galleryUrls ? `{${galleryUrls.join(",")}}` : "{}",
        description || null,
    ]);

    const vehicle = vResult.rows[0];

    // Insert modifications
    if (modifications?.length) {
      for (const m of modifications) {
        await db.query(
          "INSERT INTO modifications (vehicle_id, category, title, brand) VALUES ($1, $2, $3, $4)",
          [vehicle.id, m.category, m.title, m.brand || null],
        );
      }
    }

    // +50 bounty
    await db.query("UPDATE users SET bounty_score = bounty_score + 50 WHERE id = $1", [req.user.id]);

    res.status(201).json({ success: true, slug: vehicle.slug });
  } catch (err) {
    console.error("Error creating vehicle:", err);
    res.status(500).json({ error: "Error al crear veh\u00EDculo" });
  }
});

export default router;
