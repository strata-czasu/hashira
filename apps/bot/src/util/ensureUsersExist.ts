import type { PrismaTransaction } from "@hashira/db";
import {
  GuildMember,
  Message,
  ThreadMember,
  User,
  type UserResolvable,
} from "discord.js";

const resolveId = (userResolvable: UserResolvable) => {
  if (
    userResolvable instanceof User ||
    userResolvable instanceof GuildMember ||
    userResolvable instanceof ThreadMember
  ) {
    return { id: userResolvable.id };
  }
  if (userResolvable instanceof Message) return { id: userResolvable.author.id };

  return { id: userResolvable };
};

export async function ensureUsersExist(
  prisma: PrismaTransaction,
  users: UserResolvable[],
) {
  await prisma.user.createMany({ data: users.map(resolveId), skipDuplicates: true });
}

export async function ensureUserExists(db: PrismaTransaction, user: User | string) {
  await ensureUsersExist(db, [user]);
}
