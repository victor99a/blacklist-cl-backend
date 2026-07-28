import postgres from "postgres";

const url = process.env.DATABASE_URL ||
  `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;

const sql = postgres(url, {
  ssl: { rejectUnauthorized: false },
  connect_timeout: 10,
});

sql`SELECT 1`.then(() => {
  console.log("[DB] Connected");
}).catch((err) => {
  console.error("[DB] Connection error:", err.message);
});

export default {
  query: async (text, params) => {
    const result = await sql.unsafe(text, params || []);
    return { rows: result };
  },
};
