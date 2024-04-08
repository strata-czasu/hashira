CREATE TABLE IF NOT EXISTS "core_user_text_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"guildId" text NOT NULL,
	"messageId" text NOT NULL,
	"channelId" text NOT NULL,
	"timestamp" timestamp NOT NULL
);
--> statement-breakpoint
DROP TABLE "core_user_activity";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_user_text_activity" ADD CONSTRAINT "core_user_text_activity_userId_core_users_id_fk" FOREIGN KEY ("userId") REFERENCES "core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_user_text_activity" ADD CONSTRAINT "core_user_text_activity_guildId_core_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "core_guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
