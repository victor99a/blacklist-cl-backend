import db from "../db.js";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  password_hash TEXT,
  avatar_url TEXT,
  bio TEXT,
  city TEXT,
  instagram TEXT,
  tiktok TEXT,
  bounty_score INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workshops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID UNIQUE REFERENCES users(id),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  city_region TEXT NOT NULL,
  instagram TEXT,
  specialties TEXT[] DEFAULT '{}',
  is_verified BOOLEAN DEFAULT false,
  rating_avg NUMERIC(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  slug TEXT UNIQUE NOT NULL,
  main_image_url TEXT,
  description TEXT,
  power INTEGER,
  specs_0_100 TEXT,
  drivetrain TEXT,
  city TEXT,
  is_published BOOLEAN DEFAULT false,
  respect_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  brand TEXT,
  description TEXT,
  workshop_id UUID REFERENCES workshops(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS votes (
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (vehicle_id, user_id)
);

CREATE TABLE IF NOT EXISTS bounty_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  action TEXT NOT NULL,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_vehicles_respect ON vehicles(respect_count DESC);
CREATE INDEX IF NOT EXISTS idx_vehicles_user ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_mods_vehicle ON modifications(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_votes_vehicle ON votes(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bounty_profile ON bounty_log(profile_id);
`;

export async function setup(req, res) {
  try {
    const statements = SCHEMA_SQL.split(";").filter(s => s.trim());
    for (const stmt of statements) {
      if (stmt) await db.query(stmt + ";");
    }
    res.json({ success: true, message: "Schema created" });
  } catch (err) {
    console.error("Setup error:", err.message);
    res.status(500).json({ error: err.message });
  }
}

export async function migrate(req, res) {
  try {
    await db.query("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] DEFAULT '{}'");
    res.json({ success: true, message: "Migration applied" });
  } catch (err) {
    console.error("Migration error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
