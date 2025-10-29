/*
  Warnings:

  - You are about to drop the column `winnerUserId` on the `Halloween2025CombatLog` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Halloween2025MonsterSpawn` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Halloween2025MonsterSpawn" DROP CONSTRAINT "Halloween2025MonsterSpawn_userId_fkey";

-- AlterTable
ALTER TABLE "public"."Halloween2025CombatLog" DROP COLUMN "winnerUserId";

-- AlterTable
ALTER TABLE "public"."Halloween2025MonsterSpawn" DROP COLUMN "userId";

-- CreateTable
CREATE TABLE "public"."Halloween2025MonsterLoot" (
    "id" SERIAL NOT NULL,
    "spawnId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "damageDealt" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Halloween2025MonsterLoot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Halloween2025MonsterLoot_userId_idx" ON "public"."Halloween2025MonsterLoot"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Halloween2025MonsterLoot_spawnId_userId_key" ON "public"."Halloween2025MonsterLoot"("spawnId", "userId");

-- AddForeignKey
ALTER TABLE "public"."Halloween2025MonsterLoot" ADD CONSTRAINT "Halloween2025MonsterLoot_spawnId_fkey" FOREIGN KEY ("spawnId") REFERENCES "public"."Halloween2025MonsterSpawn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Halloween2025MonsterLoot" ADD CONSTRAINT "Halloween2025MonsterLoot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
