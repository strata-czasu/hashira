import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  foreignKey,
  integer,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "..";
import { strataPgTable } from "../../pgtable";

export const birthdayEvent2024Stage = strataPgTable(
  "birthdayEventStage2024",
  {
    id: serial("id").primaryKey(),
    requiredStageId: integer("requiredStageId").references(
      (): AnyPgColumn => birthdayEvent2024Stage.id,
    ),
    keyword: text("keyword").notNull(),
    outputRequirementsValid: text("outputRequirementsValid").notNull(),
    outputRequirementsInvalid: text("outputRequirementsInvalid"),
    buttons: text("buttons").array().notNull().default(sql`'{}'::text[]`),
    lockedBy: integer("lockedBy").array().notNull().default(sql`'{}'::int[]`),
  },
  (table) => {
    return {
      parentReference: foreignKey({
        columns: [table.requiredStageId],
        foreignColumns: [table.id],
      }),
    };
  },
);

export const birthdayEvent2024StageCompletion = strataPgTable(
  "birthdayEventStage2024Completion",
  {
    id: serial("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
    stageId: integer("stageId")
      .notNull()
      .references(() => birthdayEvent2024Stage.id),
  },
);

export const birthdayEvent2024StageCompletionRelations = relations(
  birthdayEvent2024StageCompletion,
  ({ one }) => ({
    user: one(user, {
      fields: [birthdayEvent2024StageCompletion.userId],
      references: [user.id],
    }),
    stage: one(birthdayEvent2024Stage, {
      fields: [birthdayEvent2024StageCompletion.stageId],
      references: [birthdayEvent2024Stage.id],
    }),
  }),
);
