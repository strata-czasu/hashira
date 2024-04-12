CREATE TABLE IF NOT EXISTS "core_mute" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"edited_at" timestamp,
	"deleted_at" timestamp,
	"guild_id" text NOT NULL,
	"user_id" text NOT NULL,
	"moderator_id" text NOT NULL,
	"reason" text NOT NULL,
	"ends_at" timestamp NOT NULL,
	"deleted" boolean DEFAULT false,
	"delete_reason" text
);
--> statement-breakpoint
DROP INDEX IF EXISTS "user_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "deleted_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "core_mute_user_id_index" ON "core_mute" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "core_mute_deleted_index" ON "core_mute" ("deleted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "core_warn_user_id_index" ON "core_warn" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "core_warn_deleted_index" ON "core_warn" ("deleted");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_mute" ADD CONSTRAINT "core_mute_guild_id_core_guild_id_fk" FOREIGN KEY ("guild_id") REFERENCES "core_guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_mute" ADD CONSTRAINT "core_mute_user_id_core_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_mute" ADD CONSTRAINT "core_mute_moderator_id_core_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
