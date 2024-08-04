CREATE TABLE IF NOT EXISTS "strata_birthday_event_stage_2024" (
	"id" serial PRIMARY KEY NOT NULL,
	"required_stage_id" integer,
	"keyword" text NOT NULL,
	"output_requirements_valid" text NOT NULL,
	"output_requirements_invalid" text,
	"buttons" text[] DEFAULT '{}'::text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "strata_birthday_event_stage_2024_completion" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"stage_id" integer NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "strata_birthday_event_stage_2024" ADD CONSTRAINT "strata_birthday_event_stage_2024_required_stage_id_strata_birthday_event_stage_2024_id_fk" FOREIGN KEY ("required_stage_id") REFERENCES "public"."strata_birthday_event_stage_2024"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "strata_birthday_event_stage_2024_completion" ADD CONSTRAINT "strata_birthday_event_stage_2024_completion_userId_core_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "strata_birthday_event_stage_2024_completion" ADD CONSTRAINT "strata_birthday_event_stage_2024_completion_stage_id_strata_birthday_event_stage_2024_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."strata_birthday_event_stage_2024"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
