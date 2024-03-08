ALTER TABLE "core_wallet" ALTER COLUMN "userId" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "core_emoji_usage" ALTER COLUMN "guildId" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "core_emoji_usage" ALTER COLUMN "userId" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "core_guild" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "core_users" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "core_user_activity" ALTER COLUMN "userId" SET DATA TYPE text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_wallet" ADD CONSTRAINT "core_wallet_userId_core_users_id_fk" FOREIGN KEY ("userId") REFERENCES "core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_emoji_usage" ADD CONSTRAINT "core_emoji_usage_guildId_core_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "core_guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_user_activity" ADD CONSTRAINT "core_user_activity_userId_core_users_id_fk" FOREIGN KEY ("userId") REFERENCES "core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
