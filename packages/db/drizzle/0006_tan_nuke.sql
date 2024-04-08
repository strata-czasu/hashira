ALTER TABLE "core_user_activity" ADD COLUMN "guildId" text NOT NULL;--> statement-breakpoint
ALTER TABLE "core_user_activity" ADD COLUMN "channelId" text NOT NULL;--> statement-breakpoint
ALTER TABLE "core_user_activity" ADD COLUMN "timestamp" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_user_activity" ADD CONSTRAINT "core_user_activity_guildId_core_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "core_guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
