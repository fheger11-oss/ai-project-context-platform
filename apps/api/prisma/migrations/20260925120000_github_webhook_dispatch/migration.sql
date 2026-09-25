CREATE TYPE "WebhookProvider" AS ENUM ('GITHUB');
CREATE TYPE "RepositoryUpdateDispatchStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'IGNORED', 'FAILED');

CREATE TABLE "repository_webhook_deliveries" (
    "id" TEXT NOT NULL,
    "provider" "WebhookProvider" NOT NULL,
    "delivery_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "provider_repository_id" TEXT NOT NULL,
    "repository_full_name" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "target_commit_sha" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "repository_webhook_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "repository_update_dispatches" (
    "id" TEXT NOT NULL,
    "webhook_delivery_id" TEXT NOT NULL,
    "repository_id" TEXT NOT NULL,
    "status" "RepositoryUpdateDispatchStatus" NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimed_by" TEXT,
    "lease_until" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "last_failure_category" TEXT,
    "repository_update_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "repository_update_dispatches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "repository_webhook_deliveries_provider_delivery_id_key" ON "repository_webhook_deliveries"("provider", "delivery_id");
CREATE UNIQUE INDEX "repository_update_dispatches_webhook_delivery_id_repository_id_key" ON "repository_update_dispatches"("webhook_delivery_id", "repository_id");
CREATE INDEX "repository_update_dispatches_status_next_attempt_at_idx" ON "repository_update_dispatches"("status", "next_attempt_at");
CREATE INDEX "repository_update_dispatches_status_lease_until_idx" ON "repository_update_dispatches"("status", "lease_until");
CREATE INDEX "repository_update_dispatches_repository_id_idx" ON "repository_update_dispatches"("repository_id");

ALTER TABLE "repository_update_dispatches" ADD CONSTRAINT "repository_update_dispatches_webhook_delivery_id_fkey" FOREIGN KEY ("webhook_delivery_id") REFERENCES "repository_webhook_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "repository_update_dispatches" ADD CONSTRAINT "repository_update_dispatches_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "repository_update_dispatches" ADD CONSTRAINT "repository_update_dispatches_repository_update_id_fkey" FOREIGN KEY ("repository_update_id") REFERENCES "repository_updates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
