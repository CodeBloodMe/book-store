import 'server-only';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { chapterOnePrisma?: PrismaClient };

export const prisma = globalForPrisma.chapterOnePrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.chapterOnePrisma = prisma;
}
