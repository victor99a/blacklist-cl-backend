process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("railway.internal")
    ? false
    : { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const g = globalThis;
export const prisma = g.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  g.prisma = prisma;
}
