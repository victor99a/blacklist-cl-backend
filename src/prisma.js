import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "@neondatabase/serverless";

const dbUrl = process.env.DATABASE_URL;
console.log("[DB] DATABASE_URL present:", !!dbUrl);
const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaNeon(pool);
const g = globalThis;
export const prisma = g.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  g.prisma = prisma;
}
