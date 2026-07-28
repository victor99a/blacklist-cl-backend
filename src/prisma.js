// Must be set before any imports to affect TLS behavior
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const url = process.env.DATABASE_URL || "";

const pool = new pg.Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const g = globalThis;
export const prisma = g.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  g.prisma = prisma;
}
