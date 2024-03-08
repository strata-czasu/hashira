ALTER TABLE "core_wallet" DROP CONSTRAINT "core_wallet_userId_core_users_id_fk";
--> statement-breakpoint
ALTER TABLE "core_emoji_usage" DROP CONSTRAINT "core_emoji_usage_guildId_core_guild_id_fk";
--> statement-breakpoint
ALTER TABLE "core_user_activity" DROP CONSTRAINT "core_user_activity_userId_core_users_id_fk";
