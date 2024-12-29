-- AlterTable
ALTER TABLE "guildSettings" ADD COLUMN     "meta" JSONB NOT NULL DEFAULT '{ "version": 1 }';
