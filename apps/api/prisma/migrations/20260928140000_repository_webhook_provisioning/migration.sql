CREATE TYPE "RepositoryWebhookProvisioningStatus" AS ENUM ('NOT_CONFIGURED', 'PROVISIONING', 'ENABLED', 'REQUIRES_ADMIN', 'REQUIRES_AUTHORIZATION', 'UNAVAILABLE', 'FAILED', 'CLEANUP_PENDING');
CREATE TYPE "RepositoryWebhookProvisioningOutcome" AS ENUM ('WEBHOOK_CREATED', 'WEBHOOK_ALREADY_CONFIGURED', 'WEBHOOK_UPDATED', 'WEBHOOK_NOT_AUTHORIZED', 'WEBHOOK_PROVIDER_UNAVAILABLE', 'WEBHOOK_CONFIGURATION_INVALID', 'WEBHOOK_NOT_FOUND', 'WEBHOOK_UNKNOWN_FAILURE', 'WEBHOOK_DELETED', 'WEBHOOK_ALREADY_DELETED', 'WEBHOOK_CLEANUP_PENDING');

CREATE TABLE "repository_webhooks" (
    "id" TEXT NOT NULL,
    "repository_id" TEXT NOT NULL,
    "provider" "WebhookProvider" NOT NULL,
    "provider_webhook_id" TEXT,
    "provisioning_status" "RepositoryWebhookProvisioningStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "active" BOOLEAN NOT NULL DEFAULT false,
    "callback_url" TEXT NOT NULL,
    "subscribed_events" JSONB NOT NULL,
    "secret_fingerprint" TEXT,
    "last_outcome" "RepositoryWebhookProvisioningOutcome",
    "last_provisioning_attempt_at" TIMESTAMP(3),
    "last_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "repository_webhooks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "repository_webhooks_repository_id_key" ON "repository_webhooks"("repository_id");
CREATE UNIQUE INDEX "repository_webhooks_provider_provider_webhook_id_key" ON "repository_webhooks"("provider", "provider_webhook_id");
CREATE INDEX "repository_webhooks_provisioning_status_idx" ON "repository_webhooks"("provisioning_status");

ALTER TABLE "repository_webhooks" ADD CONSTRAINT "repository_webhooks_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
