CREATE TABLE IF NOT EXISTS "core_currency" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"symbol" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core_wallet" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"userId" bigint,
	"currency" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core_emoji_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"guildId" bigint NOT NULL,
	"emojiId" bigint NOT NULL,
	"userId" bigint NOT NULL,
	"timestamp" date DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core_guild" (
	"id" bigint PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core_users" (
	"id" bigint PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core_user_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" bigint
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_wallet" ADD CONSTRAINT "core_wallet_userId_core_users_id_fk" FOREIGN KEY ("userId") REFERENCES "core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_wallet" ADD CONSTRAINT "core_wallet_currency_core_currency_id_fk" FOREIGN KEY ("currency") REFERENCES "core_currency"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_emoji_usage" ADD CONSTRAINT "core_emoji_usage_guildId_core_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "core_guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_user_activity" ADD CONSTRAINT "core_user_activity_userId_core_users_id_fk" FOREIGN KEY ("userId") REFERENCES "core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
