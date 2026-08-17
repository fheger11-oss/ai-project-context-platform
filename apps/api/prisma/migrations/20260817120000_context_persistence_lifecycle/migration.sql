CREATE TABLE "project_contexts" (
    "id" TEXT NOT NULL,
    "context_id" TEXT NOT NULL,
    "analysis_id" TEXT NOT NULL,
    "scan_id" TEXT NOT NULL,
    "repository_id" TEXT NOT NULL,
    "commit_sha" TEXT NOT NULL,
    "context_version" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_contexts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "project_contexts_context_id_idx" ON "project_contexts"("context_id");
CREATE INDEX "project_contexts_analysis_id_generated_at_created_at_id_idx" ON "project_contexts"("analysis_id", "generated_at", "created_at", "id");
CREATE INDEX "project_contexts_scan_id_idx" ON "project_contexts"("scan_id");
CREATE INDEX "project_contexts_repository_id_idx" ON "project_contexts"("repository_id");
CREATE INDEX "project_contexts_context_version_idx" ON "project_contexts"("context_version");

ALTER TABLE "project_contexts" ADD CONSTRAINT "project_contexts_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_contexts" ADD CONSTRAINT "project_contexts_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_contexts" ADD CONSTRAINT "project_contexts_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
