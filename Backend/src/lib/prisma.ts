import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

// Resolve the database file path relative to the project root
const dbPath = path.resolve(process.cwd(), 'dev.db');

const adapter = new PrismaBetterSqlite3({
  url: `file:${dbPath}`,
});

// Use a global singleton in dev to avoid exhausting connections on HMR reloads
const globalForPrisma = globalThis as unknown as { prisma3: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma3 ??
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma3 = prisma;
