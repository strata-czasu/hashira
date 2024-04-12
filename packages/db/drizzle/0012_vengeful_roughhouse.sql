ALTER TABLE "core_warn" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "core_warn" ADD COLUMN "deleted" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "core_warn" ADD COLUMN "delete_reason" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_idx" ON "core_warn" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deleted_idx" ON "core_warn" ("deleted");