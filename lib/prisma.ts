import { PrismaClient, type Prisma } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter });

export function withPrismaTransaction<T>(
  callback: (transaction: Prisma.TransactionClient) => Promise<T>,
) {
  return prisma.$transaction(callback, { maxWait: 15_000, timeout: 30_000 });
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}