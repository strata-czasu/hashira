DO $$ BEGIN
 CREATE TYPE "status" AS ENUM('pending', 'completed', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core_task" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" "status" DEFAULT 'pending',
	"createdAt" timestamp DEFAULT now(),
	"handleAfter" timestamp DEFAULT now(),
	"data" jsonb NOT NULL,
	"identifier" text DEFAULT gen_random_uuid()::text
);
