import { PrismaClient } from "@prisma/client";
import { createClient } from "@libsql/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function isTursoUrl(url: string | undefined): boolean {
  if (!url) return false;
  return url.startsWith("libsql://") || url.startsWith("https://");
}

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  const log =
    process.env.NODE_ENV === "development"
      ? (["error", "warn"] as const)
      : (["error"] as const);

  // Turso / remote libSQL → driver adapter (works on Vercel serverless).
  // Local SQLite → classic PrismaClient when DATABASE_URL is file:./dev.db.
  if (isTursoUrl(url)) {
    const authToken =
      process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN;

    const libsql = createClient({
      url: url!,
      authToken,
    });
    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({ adapter, log: [...log] });
  }

  return new PrismaClient({ log: [...log] });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
