ALTER TABLE "refresh_tokens" ALTER COLUMN "token_hash" SET DATA TYPE varchar(64);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "reset_token" SET DATA TYPE varchar(64);--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" USING btree ("user_id");