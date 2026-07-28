import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

pool.query("SELECT 1").then(() => {
  console.log("[DB] Connected to PostgreSQL");
}).catch((err) => {
  console.error("[DB] Connection error:", err.message);
});

export default pool;
