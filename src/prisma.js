import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import tls from "tls";

const url = process.env.DATABASE_URL || "";
const pool = new pg.Pool({
  connectionString: url,
  ssl: {
    rejectUnauthorized: false,
    checkServerIdentity: () => undefined, // skip server identity check
  },
});
const adapter = new PrismaPg(pool);
const g = globalThis;
export const prisma = g.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  g.prisma = prisma;
}
