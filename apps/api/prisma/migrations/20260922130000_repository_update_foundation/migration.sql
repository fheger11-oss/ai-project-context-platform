CREATE TYPE "RepositoryUpdateStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

CREATE TYPE "RepositoryUpdateTriggerType" AS ENUM ('MANUAL', 'WEBHOOK', 'SYSTEM');

CREATE TABLE "repository_updates" (
    "id" TEXT NOT NULL,
    "repository_id" TEXT NOT NULL,
    "trigger_type" "RepositoryUpdateTriggerType" NOT NULL,
    "base_commit_sha" TEXT,
    "target_commit_sha" TEXT NOT NULL,
    "status" "RepositoryUpdateStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "scan_id" TEXT,
    "analysis_id" TEXT,
    "project_context_id" TEXT,
    "change_set" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repository_updates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "repository_updates_repository_id_idx" ON "repository_updates"("repository_id");
CREATE INDEX "repository_updates_repository_id_status_idx" ON "repository_updates"("repository_id", "status");
CREATE INDEX "repository_updates_repository_id_target_commit_sha_idx" ON "repository_updates"("repository_id", "target_commit_sha");
CREATE INDEX "repository_updates_created_at_idx" ON "repository_updates"("created_at");

ALTER TABLE "repository_updates" ADD CONSTRAINT "repository_updates_repository_id_fkey"
  FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "repository_updates" ADD CONSTRAINT "repository_updates_scan_id_fkey"
  FOREIGN KEY ("scan_id") REFERENCES "scans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "repository_updates" ADD CONSTRAINT "repository_updates_analysis_id_fkey"
  FOREIGN KEY ("analysis_id") REFERENCES "analyses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "repository_updates" ADD CONSTRAINT "repository_updates_project_context_id_fkey"
  FOREIGN KEY ("project_context_id") REFERENCES "project_contexts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
