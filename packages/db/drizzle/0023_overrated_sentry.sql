ALTER TABLE "core_users" ADD COLUMN "married_to" text DEFAULT null;--> statement-breakpoint
ALTER TABLE "core_users" ADD COLUMN "married_at" timestamp;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_users" ADD CONSTRAINT "core_users_married_to_core_users_id_fk" FOREIGN KEY ("married_to") REFERENCES "public"."core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
