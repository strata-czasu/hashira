ALTER TABLE "core_currency" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "core_currency" ALTER COLUMN "symbol" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "core_wallet" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "core_user_activity" ALTER COLUMN "userId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "core_currency" ADD CONSTRAINT "core_currency_name_unique" UNIQUE("name");--> statement-breakpoint
ALTER TABLE "core_currency" ADD CONSTRAINT "core_currency_symbol_unique" UNIQUE("symbol");--> statement-breakpoint
ALTER TABLE "core_wallet" ADD CONSTRAINT "core_wallet_userId_name_unique" UNIQUE("userId","name");