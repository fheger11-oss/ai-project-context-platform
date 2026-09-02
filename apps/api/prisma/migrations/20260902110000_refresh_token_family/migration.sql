ALTER TABLE "refresh_tokens" ADD COLUMN "family_id" TEXT;

UPDATE "refresh_tokens" SET "family_id" = "id" WHERE "family_id" IS NULL;

ALTER TABLE "refresh_tokens" ALTER COLUMN "family_id" SET NOT NULL;

CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");
