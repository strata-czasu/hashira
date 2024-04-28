import type { ExtractContext } from "@hashira/core";
import { schema } from "@hashira/db";
import type { User } from "discord.js";
import type { base } from "../base";

type Context = ExtractContext<typeof base>;

export async function ensureUsersExist(
  db: Context["db"],
  users: (string | User)[],
): Promise<void> {
  const toInsert = users.map((user) => ({
    id: typeof user === "string" ? user : user.id,
  }));

  await db.insert(schema.user).values(toInsert).onConflictDoNothing();
}

export async function ensureUserExists(
  db: Context["db"],
  user: User | string,
): Promise<void> {
  await ensureUsersExist(db, [user]);
}
