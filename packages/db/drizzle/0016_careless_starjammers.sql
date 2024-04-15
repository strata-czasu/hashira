CREATE TABLE IF NOT EXISTS "core_guild_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"mute_role_id" text,
	CONSTRAINT "core_guild_settings_guild_id_unique" UNIQUE("guild_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_guild_settings" ADD CONSTRAINT "core_guild_settings_guild_id_core_guild_id_fk" FOREIGN KEY ("guild_id") REFERENCES "core_guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
