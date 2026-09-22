CREATE TYPE "RepositoryFreshnessStatus" AS ENUM ('UNKNOWN', 'FRESH', 'STALE', 'UPDATE_FAILED');

CREATE TABLE "repository_states" (
    "id" TEXT NOT NULL,
    "repository_id" TEXT NOT NULL,
    "remote_head_commit_sha" TEXT,
    "remote_head_checked_at" TIMESTAMP(3),
    "last_scanned_commit_sha" TEXT,
    "last_analyzed_commit_sha" TEXT,
    "current_project_context_id" TEXT,
    "current_context_commit_sha" TEXT,
    "freshness_status" "RepositoryFreshnessStatus" NOT NULL DEFAULT 'UNKNOWN',
    "last_update_status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repository_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "repository_states_repository_id_key" ON "repository_states"("repository_id");
CREATE UNIQUE INDEX "repository_states_current_project_context_id_key" ON "repository_states"("current_project_context_id");
CREATE INDEX "repository_states_freshness_status_idx" ON "repository_states"("freshness_status");
CREATE INDEX "repository_states_last_scanned_commit_sha_idx" ON "repository_states"("last_scanned_commit_sha");
CREATE INDEX "repository_states_last_analyzed_commit_sha_idx" ON "repository_states"("last_analyzed_commit_sha");
CREATE INDEX "repository_states_current_context_commit_sha_idx" ON "repository_states"("current_context_commit_sha");

ALTER TABLE "repository_states" ADD CONSTRAINT "repository_states_repository_id_fkey"
  FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "repository_states" ADD CONSTRAINT "repository_states_current_project_context_id_fkey"
  FOREIGN KEY ("current_project_context_id") REFERENCES "project_contexts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
