import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import pg from "pg"
import { databaseUrl } from "./database-url"

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createPrismaClient() {
  // Pool plafonné : sur Vercel chaque instance de fonction a le sien, la limite de connexions de
  // la base est vite atteinte avec le défaut de pg (10 par instance).
  const pool = new pg.Pool({
    connectionString: databaseUrl(),
    max: 3,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
    query_timeout: 30_000,
    keepAlive: true,
  })
  return new PrismaClient({ adapter: new PrismaPg(pool) })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
