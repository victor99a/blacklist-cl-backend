import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL || "";
const pool = new Pool({ connectionString: url });
const adapter = new PrismaNeon(pool);
const g = globalThis;
export const prisma = g.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  g.prisma = prisma;
}
