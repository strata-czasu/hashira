-- CreateEnum
CREATE TYPE "entry_type" AS ENUM ('debit', 'credit');

-- CreateEnum
CREATE TYPE "status" AS ENUM ('pending', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "transaction_type" AS ENUM ('transfer', 'add');

-- CreateEnum
CREATE TYPE "verification_level" AS ENUM ('13_plus', '18_plus', '16_plus');

-- CreateEnum
CREATE TYPE "verification_status" AS ENUM ('in_progress', 'accepted', 'rejected');

-- CreateEnum
CREATE TYPE "verification_type" AS ENUM ('13_plus', '18_plus', '16_plus');

-- CreateTable
CREATE TABLE "autoRole" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "core_auto_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "birthdayEventStage2024" (
    "id" SERIAL NOT NULL,
    "requiredStageId" INTEGER,
    "keyword" TEXT NOT NULL,
    "outputRequirementsValid" TEXT NOT NULL,
    "outputRequirementsInvalid" TEXT,
    "buttons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lockedBy" INTEGER[] DEFAULT ARRAY[]::INTEGER[],

    CONSTRAINT "strata_birthday_event_stage_2024_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "birthdayEventStage2024Completion" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stageId" INTEGER NOT NULL,

    CONSTRAINT "strata_birthday_event_stage_2024_completion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colorRole" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "expiration" TIMESTAMP(6),
    "slots" INTEGER NOT NULL,

    CONSTRAINT "strata_color_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currency" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "core_currency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dailyPointsRedeems" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strata_daily_points_redeems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emojiUsage" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "emojiId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "core_emoji_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guild" (
    "id" TEXT NOT NULL,

    CONSTRAINT "core_guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guildSettings" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "muteRoleId" TEXT,
    "plus18RoleId" TEXT,

    CONSTRAINT "core_guild_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventoryItem" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(6),

    CONSTRAINT "core_inventory_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(6),
    "deletedAt" TIMESTAMP(6),
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "core_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mute" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(6),
    "deletedAt" TIMESTAMP(6),
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "endsAt" TIMESTAMP(6) NOT NULL,
    "deleteReason" TEXT,

    CONSTRAINT "core_mute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopItem" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(6),
    "deletedAt" TIMESTAMP(6),
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "core_shop_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task" (
    "id" SERIAL NOT NULL,
    "status" "status" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handleAfter" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB NOT NULL,
    "identifier" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,

    CONSTRAINT "core_task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction" (
    "id" SERIAL NOT NULL,
    "wallet" INTEGER NOT NULL,
    "relatedWallet" INTEGER,
    "relatedUserId" TEXT,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "transactionType" "transaction_type" NOT NULL,
    "entryType" "entry_type" NOT NULL,

    CONSTRAINT "core_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "userTextActivity" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "core_user_text_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "verificationLevel" "verification_level",
    "marriedTo" TEXT,
    "marriedAt" TIMESTAMP(6),

    CONSTRAINT "core_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(6),
    "rejectedAt" TIMESTAMP(6),
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "type" "verification_type" NOT NULL,
    "status" "verification_status" DEFAULT 'in_progress',

    CONSTRAINT "core_verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" INTEGER NOT NULL,
    "default" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guildId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "core_wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warn" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(6),
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(6),
    "deleteReason" TEXT,

    CONSTRAINT "core_warn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "autoRole_guildId_roleId_unique" ON "autoRole"("guildId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "currency_guildId_name_unique" ON "currency"("guildId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "currency_guildId_symbol_unique" ON "currency"("guildId", "symbol");

-- CreateIndex
CREATE UNIQUE INDEX "guildSettings_guildId_unique" ON "guildSettings"("guildId");

-- CreateIndex
CREATE INDEX "mute_userId_index" ON "mute"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_userId_name_guildId_unique" ON "wallet"("userId", "name", "guildId");

-- CreateIndex
CREATE INDEX "warn_userId_index" ON "warn"("userId");

-- AddForeignKey
ALTER TABLE "autoRole" ADD CONSTRAINT "autoRole_guildId_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "birthdayEventStage2024" ADD CONSTRAINT "birthdayEventStage2024_requiredStageId_birthdayEventStage2024_i" FOREIGN KEY ("requiredStageId") REFERENCES "birthdayEventStage2024"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "birthdayEventStage2024Completion" ADD CONSTRAINT "birthdayEventStage2024Completion_stageId_birthdayEventStage2024" FOREIGN KEY ("stageId") REFERENCES "birthdayEventStage2024"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "birthdayEventStage2024Completion" ADD CONSTRAINT "birthdayEventStage2024Completion_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "colorRole" ADD CONSTRAINT "colorRole_guildId_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "colorRole" ADD CONSTRAINT "colorRole_ownerId_users_id_fk" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "currency" ADD CONSTRAINT "currency_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "currency" ADD CONSTRAINT "currency_guildId_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dailyPointsRedeems" ADD CONSTRAINT "dailyPointsRedeems_guildId_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dailyPointsRedeems" ADD CONSTRAINT "dailyPointsRedeems_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "emojiUsage" ADD CONSTRAINT "emojiUsage_guildId_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "guildSettings" ADD CONSTRAINT "guildSettings_guildId_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventoryItem" ADD CONSTRAINT "inventoryItem_itemId_item_id_fk" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventoryItem" ADD CONSTRAINT "inventoryItem_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "item" ADD CONSTRAINT "item_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mute" ADD CONSTRAINT "mute_guildId_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mute" ADD CONSTRAINT "mute_moderatorId_users_id_fk" FOREIGN KEY ("moderatorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mute" ADD CONSTRAINT "mute_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "shopItem" ADD CONSTRAINT "shopItem_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "shopItem" ADD CONSTRAINT "shopItem_itemId_item_id_fk" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_relatedUserId_users_id_fk" FOREIGN KEY ("relatedUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_relatedWallet_wallet_id_fk" FOREIGN KEY ("relatedWallet") REFERENCES "wallet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_wallet_wallet_id_fk" FOREIGN KEY ("wallet") REFERENCES "wallet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "userTextActivity" ADD CONSTRAINT "userTextActivity_guildId_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "userTextActivity" ADD CONSTRAINT "userTextActivity_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_marriedTo_users_id_fk" FOREIGN KEY ("marriedTo") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "verification" ADD CONSTRAINT "verification_guildId_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "verification" ADD CONSTRAINT "verification_moderatorId_users_id_fk" FOREIGN KEY ("moderatorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "verification" ADD CONSTRAINT "verification_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "wallet" ADD CONSTRAINT "wallet_currency_currency_id_fk" FOREIGN KEY ("currency") REFERENCES "currency"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "wallet" ADD CONSTRAINT "wallet_guildId_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "wallet" ADD CONSTRAINT "wallet_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "warn" ADD CONSTRAINT "warn_guildId_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "warn" ADD CONSTRAINT "warn_moderatorId_users_id_fk" FOREIGN KEY ("moderatorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "warn" ADD CONSTRAINT "warn_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

