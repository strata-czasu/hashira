import { pgEnum, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { guild } from "./guild";
import { user } from "./user";

export const verificationType = pgEnum("verification_type", [
  "13_plus",
  "16_plus",
  "18_plus",
]);
// NOTE: Only "13_plus" and "16_plus" can use "in_progress" and "rejected" statuses.
//       The "18_plus" verification type can only be "accepted".
export const verificationStatus = pgEnum("verification_status", [
  "in_progress",
  "accepted",
  "rejected",
]);

export const verification = pgTable("verification", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  acceptedAt: timestamp("acceptedAt"),
  rejectedAt: timestamp("rejectedAt"),
  guildId: text("guildId")
    .notNull()
    .references(() => guild.id),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
  moderatorId: text("moderatorId")
    .notNull()
    .references(() => user.id),
  type: verificationType("type").notNull(),
  status: verificationStatus("status").default("in_progress"),
});
