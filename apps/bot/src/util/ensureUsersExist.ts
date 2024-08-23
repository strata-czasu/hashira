import type { ExtendedPrismaClient } from "@hashira/db";
import type { User } from "discord.js";

export async function ensureUsersExist(
  prisma: ExtendedPrismaClient,
  users: (string | User)[],
): Promise<void> {
  const toInsert = users.map((user) => ({
    id: typeof user === "string" ? user : user.id,
  }));

  await prisma.user.createMany({ data: toInsert, skipDuplicates: true });
}

export async function ensureUserExists(
  db: ExtendedPrismaClient,
  user: User | string,
): Promise<void> {
  await ensureUsersExist(db, [user]);
}
