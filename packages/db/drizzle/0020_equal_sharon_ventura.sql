DO $$ BEGIN
 CREATE TYPE "public"."verification_level" AS ENUM('13_plus', '18_plus');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."verification_status" AS ENUM('in_progress', 'accepted', 'rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."verification_type" AS ENUM('13_plus', '18_plus');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core_verification" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"accepted_at" timestamp,
	"rejected_at" timestamp,
	"guild_id" text NOT NULL,
	"user_id" text NOT NULL,
	"moderator_id" text NOT NULL,
	"type" "verification_type" NOT NULL,
	"status" "verification_status" DEFAULT 'in_progress'
);
--> statement-breakpoint
ALTER TABLE "core_users" ADD COLUMN "verification_level" "verification_level";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_verification" ADD CONSTRAINT "core_verification_guild_id_core_guild_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."core_guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_verification" ADD CONSTRAINT "core_verification_user_id_core_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_verification" ADD CONSTRAINT "core_verification_moderator_id_core_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
