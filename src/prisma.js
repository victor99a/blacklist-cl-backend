import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const dbUrl = process.env.DATABASE_URL || "";
// Railway internal connections don't need SSL; external via proxy needs it
// but pg module doesn't handle HTTP CONNECT proxies, so use internal URL
const isInternal = dbUrl.includes("railway.internal");
const pool = new pg.Pool({
  connectionString: dbUrl,
  ...(isInternal ? {} : { ssl: { rejectUnauthorized: false } }),
});
const adapter = new PrismaPg(pool);
const g = globalThis;
export const prisma = g.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  g.prisma = prisma;
}
