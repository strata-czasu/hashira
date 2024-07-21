DO $$ BEGIN
 CREATE TYPE "public"."entry_type" AS ENUM('debit', 'credit');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."transaction_type" AS ENUM('transfer', 'add');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core_inventory_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"itemId" integer NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"editedAt" timestamp,
	"deletedAt" timestamp,
	"createdBy" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core_shop_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"itemId" integer NOT NULL,
	"price" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"editedAt" timestamp,
	"deletedAt" timestamp,
	"createdBy" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core_transaction" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet" integer NOT NULL,
	"relatedWallet" integer,
	"relatedUserId" text,
	"amount" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"reason" text,
	"transactionType" "transaction_type" NOT NULL,
	"entryType" "entry_type" NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "strata_daily_points_redeems" (
	"id" serial PRIMARY KEY NOT NULL,
	"guildId" text NOT NULL,
	"userId" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "core_currency" DROP CONSTRAINT "core_currency_name_unique";--> statement-breakpoint
ALTER TABLE "core_currency" DROP CONSTRAINT "core_currency_symbol_unique";--> statement-breakpoint
ALTER TABLE "core_wallet" DROP CONSTRAINT "core_wallet_userId_name_unique";--> statement-breakpoint
ALTER TABLE "core_wallet" DROP CONSTRAINT "core_wallet_currency_core_currency_id_fk";
--> statement-breakpoint
ALTER TABLE "core_wallet" ALTER COLUMN "userId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "core_wallet" ALTER COLUMN "currency" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "core_currency" ADD COLUMN "guildId" text NOT NULL;--> statement-breakpoint
ALTER TABLE "core_currency" ADD COLUMN "createdBy" text NOT NULL;--> statement-breakpoint
ALTER TABLE "core_currency" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "core_wallet" ADD COLUMN "default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "core_wallet" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "core_wallet" ADD COLUMN "guildId" text NOT NULL;--> statement-breakpoint
ALTER TABLE "core_wallet" ADD COLUMN "balance" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_inventory_item" ADD CONSTRAINT "core_inventory_item_itemId_core_item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."core_item"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_inventory_item" ADD CONSTRAINT "core_inventory_item_userId_core_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_item" ADD CONSTRAINT "core_item_createdBy_core_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_shop_item" ADD CONSTRAINT "core_shop_item_itemId_core_item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."core_item"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_shop_item" ADD CONSTRAINT "core_shop_item_createdBy_core_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_transaction" ADD CONSTRAINT "core_transaction_wallet_core_wallet_id_fk" FOREIGN KEY ("wallet") REFERENCES "public"."core_wallet"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_transaction" ADD CONSTRAINT "core_transaction_relatedWallet_core_wallet_id_fk" FOREIGN KEY ("relatedWallet") REFERENCES "public"."core_wallet"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_transaction" ADD CONSTRAINT "core_transaction_relatedUserId_core_users_id_fk" FOREIGN KEY ("relatedUserId") REFERENCES "public"."core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "strata_daily_points_redeems" ADD CONSTRAINT "strata_daily_points_redeems_guildId_core_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "public"."core_guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "strata_daily_points_redeems" ADD CONSTRAINT "strata_daily_points_redeems_userId_core_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."core_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_currency" ADD CONSTRAINT "core_currency_guildId_core_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "public"."core_guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_currency" ADD CONSTRAINT "core_currency_createdBy_core_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."core_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_wallet" ADD CONSTRAINT "core_wallet_guildId_core_guild_id_fk" FOREIGN KEY ("guildId") REFERENCES "public"."core_guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_wallet" ADD CONSTRAINT "core_wallet_currency_core_currency_id_fk" FOREIGN KEY ("currency") REFERENCES "public"."core_currency"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "core_currency" ADD CONSTRAINT "core_currency_guildId_name_unique" UNIQUE("guildId","name");--> statement-breakpoint
ALTER TABLE "core_currency" ADD CONSTRAINT "core_currency_guildId_symbol_unique" UNIQUE("guildId","symbol");--> statement-breakpoint
ALTER TABLE "core_wallet" ADD CONSTRAINT "core_wallet_userId_name_guildId_unique" UNIQUE("userId","name","guildId");