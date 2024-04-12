CREATE TABLE IF NOT EXISTS "core_warn" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"edited_at" timestamp,
	"guild_id" text NOT NULL,
	"user_id" text NOT NULL,
	"moderator_id" text NOT NULL,
	"reason" text NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_warn" ADD CONSTRAINT "core_warn_guild_id_core_guild_id_fk" FOREIGN KEY ("guild_id") REFERENCES "core_guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_warn" ADD CONSTRAINT "core_warn_user_id_core_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_warn" ADD CONSTRAINT "core_warn_moderator_id_core_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
