import { PrismaClient } from '@/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

/**
 * Prisma client singleton.
 *
 * Prisma 7 requires an explicit driver adapter rather than bundling the engine,
 * so we construct the better-sqlite3 adapter from `DATABASE_URL` and hand it
 * to the client.
 *
 * In development `next dev` hot-reloads modules, which would otherwise open a
 * new connection pool on every edit until SQLite runs out of handles. Stash the
 * instance on `globalThis` so reloads reuse it.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaAdapter: PrismaBetterSqlite3 | undefined;
};

function createAdapter() {
  // `DATABASE_URL` is relative to the project root (the directory holding
  // `prisma7.config.ts`), which is also the cwd for `next dev`/`next start`
  // and for the seed script. Strip the `file:` scheme and let the driver
  // resolve the path against that same root, so the CLI and the app agree.
  const raw = process.env.DATABASE_URL ?? 'file:./dev.db';
  const url = raw.replace(/^file:/, '');
  return new PrismaBetterSqlite3({ url });
}

const adapter = globalForPrisma.prismaAdapter ?? createAdapter();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaAdapter = adapter;
}
