import pg from "pg";

// Use native (libpq) bindings for proper SSL support
const { Pool } = pg.native;

const url = process.env.DATABASE_URL ||
  `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;

const pool = new Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

pool.query("SELECT 1").then(() => {
  console.log("[DB] Connected");
}).catch((err) => {
  console.error("[DB] Connection error:", err.message);
});

export default pool;
