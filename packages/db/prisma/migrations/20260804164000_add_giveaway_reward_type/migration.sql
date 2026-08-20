-- CreateEnum
CREATE TYPE "giveaway_reward_type" AS ENUM ('currency', 'mute', 'item');

-- AlterTable
ALTER TABLE "GiveawayReward" ADD COLUMN     "type" "giveaway_reward_type";