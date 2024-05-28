CREATE TABLE IF NOT EXISTS "strata_color_role" (
	"id" serial PRIMARY KEY NOT NULL,
	"guildId" text NOT NULL,
	"ownerId" text NOT NULL,
	"name" text NOT NULL,
	"roleId" text NOT NULL,
	"expiration" timestamp,
	"slots" integer NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "strata_color_role" ADD CONSTRAINT "strata_color_role_guildId_core_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "public"."core_guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "strata_color_role" ADD CONSTRAINT "strata_color_role_ownerId_core_users_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
