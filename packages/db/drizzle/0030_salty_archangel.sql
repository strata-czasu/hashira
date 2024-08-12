ALTER TABLE "core_auto_role" RENAME TO "core_autoRole";--> statement-breakpoint
ALTER TABLE "core_inventory_item" RENAME TO "core_inventoryItem";--> statement-breakpoint
ALTER TABLE "core_shop_item" RENAME TO "core_shopItem";--> statement-breakpoint
ALTER TABLE "core_emoji_usage" RENAME TO "core_emojiUsage";--> statement-breakpoint
ALTER TABLE "core_guild_settings" RENAME TO "core_guildSettings";--> statement-breakpoint
ALTER TABLE "strata_birthday_event_stage_2024" RENAME TO "strata_birthdayEventStage2024";--> statement-breakpoint
ALTER TABLE "strata_birthday_event_stage_2024_completion" RENAME TO "strata_birthdayEventStage2024Completion";--> statement-breakpoint
ALTER TABLE "strata_color_role" RENAME TO "strata_colorRole";--> statement-breakpoint
ALTER TABLE "strata_daily_points_redeems" RENAME TO "strata_dailyPointsRedeems";--> statement-breakpoint
ALTER TABLE "core_user_text_activity" RENAME TO "core_userTextActivity";--> statement-breakpoint
ALTER TABLE "core_autoRole" RENAME COLUMN "guild_id" TO "guildId";--> statement-breakpoint
ALTER TABLE "core_autoRole" RENAME COLUMN "role_id" TO "roleId";--> statement-breakpoint
ALTER TABLE "core_guildSettings" RENAME COLUMN "guild_id" TO "guildId";--> statement-breakpoint
ALTER TABLE "core_guildSettings" RENAME COLUMN "mute_role_id" TO "muteRoleId";--> statement-breakpoint
ALTER TABLE "core_guildSettings" RENAME COLUMN "plus18_role_id" TO "plus18RoleId";--> statement-breakpoint
ALTER TABLE "core_mute" RENAME COLUMN "created_at" TO "createdAt";--> statement-breakpoint
ALTER TABLE "core_mute" RENAME COLUMN "edited_at" TO "editedAt";--> statement-breakpoint
ALTER TABLE "core_mute" RENAME COLUMN "deleted_at" TO "deletedAt";--> statement-breakpoint
ALTER TABLE "core_mute" RENAME COLUMN "guild_id" TO "guildId";--> statement-breakpoint
ALTER TABLE "core_mute" RENAME COLUMN "user_id" TO "userId";--> statement-breakpoint
ALTER TABLE "core_mute" RENAME COLUMN "moderator_id" TO "moderatorId";--> statement-breakpoint
ALTER TABLE "core_mute" RENAME COLUMN "ends_at" TO "endsAt";--> statement-breakpoint
ALTER TABLE "core_mute" RENAME COLUMN "delete_reason" TO "deleteReason";--> statement-breakpoint
ALTER TABLE "core_warn" RENAME COLUMN "created_at" TO "createdAt";--> statement-breakpoint
ALTER TABLE "core_warn" RENAME COLUMN "edited_at" TO "editedAt";--> statement-breakpoint
ALTER TABLE "core_warn" RENAME COLUMN "deleted_at" TO "deletedAt";--> statement-breakpoint
ALTER TABLE "core_warn" RENAME COLUMN "guild_id" TO "guildId";--> statement-breakpoint
ALTER TABLE "core_warn" RENAME COLUMN "user_id" TO "userId";--> statement-breakpoint
ALTER TABLE "core_warn" RENAME COLUMN "moderator_id" TO "moderatorId";--> statement-breakpoint
ALTER TABLE "core_warn" RENAME COLUMN "delete_reason" TO "deleteReason";--> statement-breakpoint
ALTER TABLE "strata_birthdayEventStage2024" RENAME COLUMN "required_stage_id" TO "requiredStageId";--> statement-breakpoint
ALTER TABLE "strata_birthdayEventStage2024" RENAME COLUMN "output_requirements_valid" TO "outputRequirementsValid";--> statement-breakpoint
ALTER TABLE "strata_birthdayEventStage2024" RENAME COLUMN "output_requirements_invalid" TO "outputRequirementsInvalid";--> statement-breakpoint
ALTER TABLE "strata_birthdayEventStage2024" RENAME COLUMN "locked_by" TO "lockedBy";--> statement-breakpoint
ALTER TABLE "strata_birthdayEventStage2024Completion" RENAME COLUMN "stage_id" TO "stageId";--> statement-breakpoint
ALTER TABLE "core_users" RENAME COLUMN "verification_level" TO "verificationLevel";--> statement-breakpoint
ALTER TABLE "core_users" RENAME COLUMN "married_to" TO "marriedTo";--> statement-breakpoint
ALTER TABLE "core_users" RENAME COLUMN "married_at" TO "marriedAt";--> statement-breakpoint
ALTER TABLE "core_verification" RENAME COLUMN "created_at" TO "createdAt";--> statement-breakpoint
ALTER TABLE "core_verification" RENAME COLUMN "accepted_at" TO "acceptedAt";--> statement-breakpoint
ALTER TABLE "core_verification" RENAME COLUMN "rejected_at" TO "rejectedAt";--> statement-breakpoint
ALTER TABLE "core_verification" RENAME COLUMN "guild_id" TO "guildId";--> statement-breakpoint
ALTER TABLE "core_verification" RENAME COLUMN "user_id" TO "userId";--> statement-breakpoint
ALTER TABLE "core_verification" RENAME COLUMN "moderator_id" TO "moderatorId";--> statement-breakpoint
ALTER TABLE "core_autoRole" DROP CONSTRAINT "core_auto_role_guild_id_role_id_unique";--> statement-breakpoint
ALTER TABLE "core_guildSettings" DROP CONSTRAINT "core_guild_settings_guild_id_unique";--> statement-breakpoint
ALTER TABLE "core_autoRole" DROP CONSTRAINT "core_auto_role_guild_id_core_guild_id_fk";
--> statement-breakpoint
ALTER TABLE "core_inventoryItem" DROP CONSTRAINT "core_inventory_item_itemId_core_item_id_fk";
--> statement-breakpoint
ALTER TABLE "core_inventoryItem" DROP CONSTRAINT "core_inventory_item_userId_core_users_id_fk";
--> statement-breakpoint
ALTER TABLE "core_shopItem" DROP CONSTRAINT "core_shop_item_itemId_core_item_id_fk";
--> statement-breakpoint
ALTER TABLE "core_shopItem" DROP CONSTRAINT "core_shop_item_createdBy_core_users_id_fk";
--> statement-breakpoint
ALTER TABLE "core_emojiUsage" DROP CONSTRAINT "core_emoji_usage_guildId_core_guild_id_fk";
--> statement-breakpoint
ALTER TABLE "core_guildSettings" DROP CONSTRAINT "core_guild_settings_guild_id_core_guild_id_fk";
--> statement-breakpoint
ALTER TABLE "core_mute" DROP CONSTRAINT "core_mute_guild_id_core_guild_id_fk";
--> statement-breakpoint
ALTER TABLE "core_mute" DROP CONSTRAINT "core_mute_user_id_core_users_id_fk";
--> statement-breakpoint
ALTER TABLE "core_mute" DROP CONSTRAINT "core_mute_moderator_id_core_users_id_fk";
--> statement-breakpoint
ALTER TABLE "core_warn" DROP CONSTRAINT "core_warn_guild_id_core_guild_id_fk";
--> statement-breakpoint
ALTER TABLE "core_warn" DROP CONSTRAINT "core_warn_user_id_core_users_id_fk";
--> statement-breakpoint
ALTER TABLE "core_warn" DROP CONSTRAINT "core_warn_moderator_id_core_users_id_fk";
--> statement-breakpoint
ALTER TABLE "strata_birthdayEventStage2024" DROP CONSTRAINT "strata_birthday_event_stage_2024_required_stage_id_strata_birthday_event_stage_2024_id_fk";
--> statement-breakpoint
ALTER TABLE "strata_birthdayEventStage2024Completion" DROP CONSTRAINT "strata_birthday_event_stage_2024_completion_userId_core_users_id_fk";
--> statement-breakpoint
ALTER TABLE "strata_birthdayEventStage2024Completion" DROP CONSTRAINT "strata_birthday_event_stage_2024_completion_stage_id_strata_birthday_event_stage_2024_id_fk";
--> statement-breakpoint
ALTER TABLE "strata_colorRole" DROP CONSTRAINT "strata_color_role_guildId_core_guild_id_fk";
--> statement-breakpoint
ALTER TABLE "strata_colorRole" DROP CONSTRAINT "strata_color_role_ownerId_core_users_id_fk";
--> statement-breakpoint
ALTER TABLE "strata_dailyPointsRedeems" DROP CONSTRAINT "strata_daily_points_redeems_guildId_core_guild_id_fk";
--> statement-breakpoint
ALTER TABLE "strata_dailyPointsRedeems" DROP CONSTRAINT "strata_daily_points_redeems_userId_core_users_id_fk";
--> statement-breakpoint
ALTER TABLE "core_users" DROP CONSTRAINT "core_users_married_to_core_users_id_fk";
--> statement-breakpoint
ALTER TABLE "core_userTextActivity" DROP CONSTRAINT "core_user_text_activity_userId_core_users_id_fk";
--> statement-breakpoint
ALTER TABLE "core_userTextActivity" DROP CONSTRAINT "core_user_text_activity_guildId_core_guild_id_fk";
--> statement-breakpoint
ALTER TABLE "core_verification" DROP CONSTRAINT "core_verification_guild_id_core_guild_id_fk";
--> statement-breakpoint
ALTER TABLE "core_verification" DROP CONSTRAINT "core_verification_user_id_core_users_id_fk";
--> statement-breakpoint
ALTER TABLE "core_verification" DROP CONSTRAINT "core_verification_moderator_id_core_users_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "core_mute_user_id_index";--> statement-breakpoint
DROP INDEX IF EXISTS "core_mute_ends_at_guild_id_index";--> statement-breakpoint
DROP INDEX IF EXISTS "core_warn_user_id_index";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_autoRole" ADD CONSTRAINT "core_autoRole_guildId_core_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "public"."core_guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_inventoryItem" ADD CONSTRAINT "core_inventoryItem_itemId_core_item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."core_item"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_inventoryItem" ADD CONSTRAINT "core_inventoryItem_userId_core_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_shopItem" ADD CONSTRAINT "core_shopItem_itemId_core_item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."core_item"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_shopItem" ADD CONSTRAINT "core_shopItem_createdBy_core_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_emojiUsage" ADD CONSTRAINT "core_emojiUsage_guildId_core_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "public"."core_guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_guildSettings" ADD CONSTRAINT "core_guildSettings_guildId_core_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "public"."core_guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_mute" ADD CONSTRAINT "core_mute_guildId_core_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "public"."core_guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_mute" ADD CONSTRAINT "core_mute_userId_core_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_mute" ADD CONSTRAINT "core_mute_moderatorId_core_users_id_fk" FOREIGN KEY ("moderatorId") REFERENCES "public"."core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_warn" ADD CONSTRAINT "core_warn_guildId_core_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "public"."core_guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_warn" ADD CONSTRAINT "core_warn_userId_core_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_warn" ADD CONSTRAINT "core_warn_moderatorId_core_users_id_fk" FOREIGN KEY ("moderatorId") REFERENCES "public"."core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "strata_birthdayEventStage2024" ADD CONSTRAINT "strata_birthdayEventStage2024_requiredStageId_strata_birthdayEventStage2024_id_fk" FOREIGN KEY ("requiredStageId") REFERENCES "public"."strata_birthdayEventStage2024"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "strata_birthdayEventStage2024Completion" ADD CONSTRAINT "strata_birthdayEventStage2024Completion_userId_core_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "strata_birthdayEventStage2024Completion" ADD CONSTRAINT "strata_birthdayEventStage2024Completion_stageId_strata_birthdayEventStage2024_id_fk" FOREIGN KEY ("stageId") REFERENCES "public"."strata_birthdayEventStage2024"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "strata_colorRole" ADD CONSTRAINT "strata_colorRole_guildId_core_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "public"."core_guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "strata_colorRole" ADD CONSTRAINT "strata_colorRole_ownerId_core_users_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "strata_dailyPointsRedeems" ADD CONSTRAINT "strata_dailyPointsRedeems_guildId_core_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "public"."core_guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "strata_dailyPointsRedeems" ADD CONSTRAINT "strata_dailyPointsRedeems_userId_core_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_users" ADD CONSTRAINT "core_users_marriedTo_core_users_id_fk" FOREIGN KEY ("marriedTo") REFERENCES "public"."core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_userTextActivity" ADD CONSTRAINT "core_userTextActivity_userId_core_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_userTextActivity" ADD CONSTRAINT "core_userTextActivity_guildId_core_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "public"."core_guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_verification" ADD CONSTRAINT "core_verification_guildId_core_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "public"."core_guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_verification" ADD CONSTRAINT "core_verification_userId_core_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_verification" ADD CONSTRAINT "core_verification_moderatorId_core_users_id_fk" FOREIGN KEY ("moderatorId") REFERENCES "public"."core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "core_mute_userId_index" ON "core_mute" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "core_mute_endsAt_guildId_index" ON "core_mute" USING btree ("endsAt","guildId") WHERE "core_mute"."deletedAt" is null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "core_warn_userId_index" ON "core_warn" USING btree ("userId");--> statement-breakpoint
ALTER TABLE "core_autoRole" ADD CONSTRAINT "core_autoRole_guildId_roleId_unique" UNIQUE("guildId","roleId");--> statement-breakpoint
ALTER TABLE "core_guildSettings" ADD CONSTRAINT "core_guildSettings_guildId_unique" UNIQUE("guildId");