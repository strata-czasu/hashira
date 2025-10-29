-- CreateEnum
CREATE TYPE "public"."Halloween2025ActionType" AS ENUM ('attack', 'defend', 'heal', 'buff', 'debuff', 'special');

-- CreateEnum
CREATE TYPE "public"."Halloween2025CombatState" AS ENUM ('pending', 'in_progress', 'completed_captured', 'completed_escaped');

-- CreateEnum
CREATE TYPE "public"."Halloween2025MonsterRarity" AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary');

-- CreateEnum
CREATE TYPE "public"."Halloween2025CombatResult" AS ENUM ('monster_captured', 'monster_escaped', 'all_players_defeated');

-- CreateEnum
CREATE TYPE "public"."Halloween2025AbilityType" AS ENUM ('attack', 'defend', 'heal', 'buff', 'debuff', 'counter');

-- CreateTable
CREATE TABLE "public"."Halloween2025Monster" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "guildId" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "baseHp" INTEGER NOT NULL DEFAULT 100,
    "baseAttack" INTEGER NOT NULL DEFAULT 10,
    "baseDefense" INTEGER NOT NULL DEFAULT 5,
    "baseSpeed" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "Halloween2025Monster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Halloween2025MonsterAction" (
    "id" SERIAL NOT NULL,
    "monsterId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actionType" "public"."Halloween2025ActionType" NOT NULL,
    "power" INTEGER NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "cooldown" INTEGER NOT NULL DEFAULT 0,
    "isAoe" BOOLEAN NOT NULL DEFAULT false,
    "canTargetSelf" BOOLEAN NOT NULL DEFAULT false,
    "effects" JSONB,

    CONSTRAINT "Halloween2025MonsterAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Halloween2025MonsterSpawn" (
    "id" SERIAL NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "monsterId" INTEGER NOT NULL,
    "spawnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT,
    "rarity" "public"."Halloween2025MonsterRarity" NOT NULL,
    "combatState" "public"."Halloween2025CombatState" NOT NULL DEFAULT 'pending',

    CONSTRAINT "Halloween2025MonsterSpawn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Halloween2025MonsterCatchAttempt" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "spawnId" INTEGER NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Halloween2025MonsterCatchAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Halloween2025CombatLog" (
    "id" SERIAL NOT NULL,
    "spawnId" INTEGER NOT NULL,
    "events" JSONB NOT NULL DEFAULT '[]',
    "currentTurn" INTEGER NOT NULL DEFAULT 0,
    "combatState" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "result" "public"."Halloween2025CombatResult",
    "winnerUserId" TEXT,

    CONSTRAINT "Halloween2025CombatLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Halloween2025PlayerAbility" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "abilityType" "public"."Halloween2025AbilityType" NOT NULL,
    "power" INTEGER NOT NULL,
    "cooldown" INTEGER NOT NULL DEFAULT 0,
    "canTargetPlayers" BOOLEAN NOT NULL DEFAULT false,
    "canTargetSelf" BOOLEAN NOT NULL DEFAULT true,
    "isAoe" BOOLEAN NOT NULL DEFAULT false,
    "effects" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Halloween2025PlayerAbility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Halloween2025Monster_name_guildId_key" ON "public"."Halloween2025Monster"("name", "guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Halloween2025MonsterAction_monsterId_name_key" ON "public"."Halloween2025MonsterAction"("monsterId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Halloween2025CombatLog_spawnId_key" ON "public"."Halloween2025CombatLog"("spawnId");

-- CreateIndex
CREATE UNIQUE INDEX "Halloween2025PlayerAbility_name_key" ON "public"."Halloween2025PlayerAbility"("name");

-- AddForeignKey
ALTER TABLE "public"."Halloween2025Monster" ADD CONSTRAINT "Halloween2025Monster_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Halloween2025MonsterAction" ADD CONSTRAINT "Halloween2025MonsterAction_monsterId_fkey" FOREIGN KEY ("monsterId") REFERENCES "public"."Halloween2025Monster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Halloween2025MonsterSpawn" ADD CONSTRAINT "Halloween2025MonsterSpawn_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Halloween2025MonsterSpawn" ADD CONSTRAINT "Halloween2025MonsterSpawn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Halloween2025MonsterSpawn" ADD CONSTRAINT "Halloween2025MonsterSpawn_monsterId_fkey" FOREIGN KEY ("monsterId") REFERENCES "public"."Halloween2025Monster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Halloween2025MonsterCatchAttempt" ADD CONSTRAINT "Halloween2025MonsterCatchAttempt_spawnId_fkey" FOREIGN KEY ("spawnId") REFERENCES "public"."Halloween2025MonsterSpawn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Halloween2025MonsterCatchAttempt" ADD CONSTRAINT "Halloween2025MonsterCatchAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Halloween2025CombatLog" ADD CONSTRAINT "Halloween2025CombatLog_spawnId_fkey" FOREIGN KEY ("spawnId") REFERENCES "public"."Halloween2025MonsterSpawn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
