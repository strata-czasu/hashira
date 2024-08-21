ALTER TABLE "core_autoRole" RENAME TO "autoRole";--> statement-breakpoint
ALTER TABLE "core_currency" RENAME TO "currency";--> statement-breakpoint
ALTER TABLE "core_inventoryItem" RENAME TO "inventoryItem";--> statement-breakpoint
ALTER TABLE "core_item" RENAME TO "item";--> statement-breakpoint
ALTER TABLE "core_shopItem" RENAME TO "shopItem";--> statement-breakpoint
ALTER TABLE "core_transaction" RENAME TO "transaction";--> statement-breakpoint
ALTER TABLE "core_wallet" RENAME TO "wallet";--> statement-breakpoint
ALTER TABLE "core_emojiUsage" RENAME TO "emojiUsage";--> statement-breakpoint
ALTER TABLE "core_guild" RENAME TO "guild";--> statement-breakpoint
ALTER TABLE "core_guildSettings" RENAME TO "guildSettings";--> statement-breakpoint
ALTER TABLE "core_mute" RENAME TO "mute";--> statement-breakpoint
ALTER TABLE "core_warn" RENAME TO "warn";--> statement-breakpoint
ALTER TABLE "strata_birthdayEventStage2024" RENAME TO "birthdayEventStage2024";--> statement-breakpoint
ALTER TABLE "strata_birthdayEventStage2024Completion" RENAME TO "birthdayEventStage2024Completion";--> statement-breakpoint
ALTER TABLE "strata_colorRole" RENAME TO "colorRole";--> statement-breakpoint
ALTER TABLE "strata_dailyPointsRedeems" RENAME TO "dailyPointsRedeems";--> statement-breakpoint
ALTER TABLE "core_task" RENAME TO "task";--> statement-breakpoint
ALTER TABLE "core_users" RENAME TO "users";--> statement-breakpoint
ALTER TABLE "core_userTextActivity" RENAME TO "userTextActivity";--> statement-breakpoint
ALTER TABLE "core_verification" RENAME TO "verification";--> statement-breakpoint
ALTER TABLE "autoRole" DROP CONSTRAINT "core_autoRole_guildId_roleId_unique";--> statement-breakpoint
ALTER TABLE "currency" DROP CONSTRAINT "core_currency_guildId_name_unique";--> statement-breakpoint
ALTER TABLE "currency" DROP CONSTRAINT "core_currency_guildId_symbol_unique";--> statement-breakpoint
ALTER TABLE "wallet" DROP CONSTRAINT "core_wallet_userId_name_guildId_unique";--> statement-breakpoint
ALTER TABLE "guildSettings" DROP CONSTRAINT "core_guildSettings_guildId_unique";--> statement-breakpoint
ALTER TABLE "autoRole" DROP CONSTRAINT "core_autoRole_guildId_core_guild_id_fk";
--> statement-breakpoint
ALTER TABLE "currency" DROP CONSTRAINT "core_currency_guildId_core_guild_id_fk";
--> statement-breakpoint
ALTER TABLE "currency" DROP CONSTRAINT "core_currency_createdBy_core_users_id_fk";
--> statement-breakpoint
ALTER TABLE "inventoryItem" DROP CONSTRAINT "core_inventoryItem_itemId_core_item_id_fk";
--> statement-breakpoint
ALTER TABLE "inventoryItem" DROP CONSTRAINT "core_inventoryItem_userId_core_users_id_fk";
--> statement-breakpoint
ALTER TABLE "item" DROP CONSTRAINT "core_item_createdBy_core_users_id_fk";
--> statement-breakpoint
ALTER TABLE "shopItem" DROP CONSTRAINT "core_shopItem_itemId_core_item_id_fk";
--> statement-breakpoint
ALTER TABLE "shopItem" DROP CONSTRAINT "core_shopItem_createdBy_core_users_id_fk";
--> statement-breakpoint
ALTER TABLE "transaction" DROP CONSTRAINT "core_transaction_wallet_core_wallet_id_fk";
--> statement-breakpoint
ALTER TABLE "transaction" DROP CONSTRAINT "core_transaction_relatedWallet_core_wallet_id_fk";
--> statement-breakpoint
ALTER TABLE "transaction" DROP CONSTRAINT "core_transaction_relatedUserId_core_users_id_fk";
--> statement-breakpoint
ALTER TABLE "wallet" DROP CONSTRAINT "core_wallet_userId_core_users_id_fk";
--> statement-breakpoint
ALTER TABLE "wallet" DROP CONSTRAINT "core_wallet_guildId_core_guild_id_fk";
--> statement-breakpoint
ALTER TABLE "wallet" DROP CONSTRAINT "core_wallet_currency_core_currency_id_fk";
--> statement-breakpoint
ALTER TABLE "emojiUsage" DROP CONSTRAINT "core_emojiUsage_guildId_core_guild_id_fk";
--> statement-breakpoint
ALTER TABLE "guildSettings" DROP CONSTRAINT "core_guildSettings_guildId_core_guild_id_fk";
--> statement-breakpoint
ALTER TABLE "mute" DROP CONSTRAINT "core_mute_guildId_core_guild_id_fk";
--> statement-breakpoint
ALTER TABLE "mute" DROP CONSTRAINT "core_mute_userId_core_users_id_fk";
--> statement-breakpoint
ALTER TABLE "mute" DROP CONSTRAINT "core_mute_moderatorId_core_users_id_fk";
--> statement-breakpoint
ALTER TABLE "warn" DROP CONSTRAINT "core_warn_guildId_core_guild_id_fk";
--> statement-breakpoint
ALTER TABLE "warn" DROP CONSTRAINT "core_warn_userId_core_users_id_fk";
--> statement-breakpoint
ALTER TABLE "warn" DROP CONSTRAINT "core_warn_moderatorId_core_users_id_fk";
--> statement-breakpoint
ALTER TABLE "birthdayEventStage2024" DROP CONSTRAINT "strata_birthdayEventStage2024_requiredStageId_strata_birthdayEventStage2024_id_fk";
--> statement-breakpoint
ALTER TABLE "birthdayEventStage2024Completion" DROP CONSTRAINT "strata_birthdayEventStage2024Completion_userId_core_users_id_fk";
--> statement-breakpoint
ALTER TABLE "birthdayEventStage2024Completion" DROP CONSTRAINT "strata_birthdayEventStage2024Completion_stageId_strata_birthdayEventStage2024_id_fk";
--> statement-breakpoint
ALTER TABLE "colorRole" DROP CONSTRAINT "strata_colorRole_guildId_core_guild_id_fk";
--> statement-breakpoint
ALTER TABLE "colorRole" DROP CONSTRAINT "strata_colorRole_ownerId_core_users_id_fk";
--> statement-breakpoint
ALTER TABLE "dailyPointsRedeems" DROP CONSTRAINT "strata_dailyPointsRedeems_guildId_core_guild_id_fk";
--> statement-breakpoint
ALTER TABLE "dailyPointsRedeems" DROP CONSTRAINT "strata_dailyPointsRedeems_userId_core_users_id_fk";
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "core_users_marriedTo_core_users_id_fk";
--> statement-breakpoint
ALTER TABLE "userTextActivity" DROP CONSTRAINT "core_userTextActivity_userId_core_users_id_fk";
--> statement-breakpoint
ALTER TABLE "userTextActivity" DROP CONSTRAINT "core_userTextActivity_guildId_core_guild_id_fk";
--> statement-breakpoint
ALTER TABLE "verification" DROP CONSTRAINT "core_verification_guildId_core_guild_id_fk";
--> statement-breakpoint
ALTER TABLE "verification" DROP CONSTRAINT "core_verification_userId_core_users_id_fk";
--> statement-breakpoint
ALTER TABLE "verification" DROP CONSTRAINT "core_verification_moderatorId_core_users_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "core_mute_userId_index";--> statement-breakpoint
DROP INDEX IF EXISTS "core_mute_endsAt_guildId_index";--> statement-breakpoint
DROP INDEX IF EXISTS "core_warn_userId_index";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "autoRole" ADD CONSTRAINT "autoRole_guildId_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "public"."guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "currency" ADD CONSTRAINT "currency_guildId_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "public"."guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "currency" ADD CONSTRAINT "currency_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventoryItem" ADD CONSTRAINT "inventoryItem_itemId_item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."item"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventoryItem" ADD CONSTRAINT "inventoryItem_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "item" ADD CONSTRAINT "item_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shopItem" ADD CONSTRAINT "shopItem_itemId_item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."item"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shopItem" ADD CONSTRAINT "shopItem_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transaction" ADD CONSTRAINT "transaction_wallet_wallet_id_fk" FOREIGN KEY ("wallet") REFERENCES "public"."wallet"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transaction" ADD CONSTRAINT "transaction_relatedWallet_wallet_id_fk" FOREIGN KEY ("relatedWallet") REFERENCES "public"."wallet"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transaction" ADD CONSTRAINT "transaction_relatedUserId_users_id_fk" FOREIGN KEY ("relatedUserId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wallet" ADD CONSTRAINT "wallet_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wallet" ADD CONSTRAINT "wallet_guildId_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "public"."guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wallet" ADD CONSTRAINT "wallet_currency_currency_id_fk" FOREIGN KEY ("currency") REFERENCES "public"."currency"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "emojiUsage" ADD CONSTRAINT "emojiUsage_guildId_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "public"."guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "guildSettings" ADD CONSTRAINT "guildSettings_guildId_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "public"."guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mute" ADD CONSTRAINT "mute_guildId_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "public"."guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mute" ADD CONSTRAINT "mute_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mute" ADD CONSTRAINT "mute_moderatorId_users_id_fk" FOREIGN KEY ("moderatorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "warn" ADD CONSTRAINT "warn_guildId_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "public"."guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "warn" ADD CONSTRAINT "warn_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "warn" ADD CONSTRAINT "warn_moderatorId_users_id_fk" FOREIGN KEY ("moderatorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "birthdayEventStage2024" ADD CONSTRAINT "birthdayEventStage2024_requiredStageId_birthdayEventStage2024_id_fk" FOREIGN KEY ("requiredStageId") REFERENCES "public"."birthdayEventStage2024"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "birthdayEventStage2024Completion" ADD CONSTRAINT "birthdayEventStage2024Completion_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "birthdayEventStage2024Completion" ADD CONSTRAINT "birthdayEventStage2024Completion_stageId_birthdayEventStage2024_id_fk" FOREIGN KEY ("stageId") REFERENCES "public"."birthdayEventStage2024"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "colorRole" ADD CONSTRAINT "colorRole_guildId_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "public"."guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "colorRole" ADD CONSTRAINT "colorRole_ownerId_users_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dailyPointsRedeems" ADD CONSTRAINT "dailyPointsRedeems_guildId_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "public"."guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dailyPointsRedeems" ADD CONSTRAINT "dailyPointsRedeems_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_marriedTo_users_id_fk" FOREIGN KEY ("marriedTo") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "userTextActivity" ADD CONSTRAINT "userTextActivity_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "userTextActivity" ADD CONSTRAINT "userTextActivity_guildId_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "public"."guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "verification" ADD CONSTRAINT "verification_guildId_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "public"."guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "verification" ADD CONSTRAINT "verification_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "verification" ADD CONSTRAINT "verification_moderatorId_users_id_fk" FOREIGN KEY ("moderatorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mute_userId_index" ON "mute" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mute_endsAt_guildId_index" ON "mute" USING btree ("endsAt","guildId") WHERE "mute"."deletedAt" is null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "warn_userId_index" ON "warn" USING btree ("userId");--> statement-breakpoint
ALTER TABLE "autoRole" ADD CONSTRAINT "autoRole_guildId_roleId_unique" UNIQUE("guildId","roleId");--> statement-breakpoint
ALTER TABLE "currency" ADD CONSTRAINT "currency_guildId_name_unique" UNIQUE("guildId","name");--> statement-breakpoint
ALTER TABLE "currency" ADD CONSTRAINT "currency_guildId_symbol_unique" UNIQUE("guildId","symbol");--> statement-breakpoint
ALTER TABLE "wallet" ADD CONSTRAINT "wallet_userId_name_guildId_unique" UNIQUE("userId","name","guildId");--> statement-breakpoint
ALTER TABLE "guildSettings" ADD CONSTRAINT "guildSettings_guildId_unique" UNIQUE("guildId");