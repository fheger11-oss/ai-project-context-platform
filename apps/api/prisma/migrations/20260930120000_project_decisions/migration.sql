-- V3.3: explicit repository-scoped project decisions with optional provenance.
CREATE TYPE "ProjectDecisionStatus" AS ENUM ('ACTIVE', 'SUPERSEDED', 'ARCHIVED');

-- Required for repository-scoped provenance from ProjectDecision.
CREATE UNIQUE INDEX "repository_updates_id_repository_id_key"
  ON "repository_updates"("id", "repository_id");

CREATE TABLE "project_decisions" (
    "id" TEXT NOT NULL,
    "repository_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "affected_area" TEXT NOT NULL,
    "status" "ProjectDecisionStatus" NOT NULL DEFAULT 'ACTIVE',
    "decided_at" TIMESTAMP(3) NOT NULL,
    "source_project_context_id" TEXT,
    "source_repository_update_id" TEXT,
    "source_commit_sha" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_decisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "project_decisions_repository_id_status_decided_at_id_idx"
  ON "project_decisions"("repository_id", "status", "decided_at", "id");
CREATE INDEX "project_decisions_source_project_context_id_idx"
  ON "project_decisions"("source_project_context_id");
CREATE INDEX "project_decisions_source_repository_update_id_idx"
  ON "project_decisions"("source_repository_update_id");

ALTER TABLE "project_decisions"
  ADD CONSTRAINT "project_decisions_repository_id_fkey"
  FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_decisions"
  ADD CONSTRAINT "project_decisions_source_project_context_id_repository_id_fkey"
  FOREIGN KEY ("source_project_context_id", "repository_id")
  REFERENCES "project_contexts"("id", "repository_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_decisions"
  ADD CONSTRAINT "project_decisions_source_repository_update_id_repository_id_fkey"
  FOREIGN KEY ("source_repository_update_id", "repository_id")
  REFERENCES "repository_updates"("id", "repository_id") ON DELETE RESTRICT ON UPDATE CASCADE;
