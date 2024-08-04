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
  "birthday_event_stage_2024",
  {
    id: serial("id").primaryKey(),
    requiredStageId: integer("required_stage_id").references(
      (): AnyPgColumn => birthdayEvent2024Stage.id,
    ),
    keyword: text("keyword").notNull(),
    outputRequirementsValid: text("output_requirements_valid").notNull(),
    outputRequirementsInvalid: text("output_requirements_invalid"),
    buttons: text("buttons").array().notNull().default(sql`'{}'::text[]`),
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
  "birthday_event_stage_2024_completion",
  {
    id: serial("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
    stageId: integer("stage_id")
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
