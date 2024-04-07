CREATE TABLE IF NOT EXISTS "core_auto_role" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"role_id" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "core_auto_role_guild_id_role_id_unique" UNIQUE("guild_id","role_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_auto_role" ADD CONSTRAINT "core_auto_role_guild_id_core_guild_id_fk" FOREIGN KEY ("guild_id") REFERENCES "core_guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
