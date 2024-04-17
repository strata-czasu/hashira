DROP INDEX IF EXISTS "core_mute_deleted_index";--> statement-breakpoint
DROP INDEX IF EXISTS "core_warn_deleted_index";--> statement-breakpoint
ALTER TABLE "core_mute" DROP COLUMN IF EXISTS "deleted";--> statement-breakpoint
ALTER TABLE "core_warn" DROP COLUMN IF EXISTS "deleted";