CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

CREATE TABLE "analyses" (
    "id" TEXT NOT NULL,
    "scan_id" TEXT NOT NULL,
    "repository_id" TEXT NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "analyzer_version" TEXT NOT NULL,
    "commit_sha" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3),
    "project" JSONB,
    "files" JSONB,
    "source_structures" JSONB,
    "relationships" JSONB,
    "dependencies" JSONB,
    "issues" JSONB,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "analyses_scan_id_idx" ON "analyses"("scan_id");
CREATE INDEX "analyses_repository_id_idx" ON "analyses"("repository_id");
CREATE INDEX "analyses_scan_id_analyzer_version_idx" ON "analyses"("scan_id", "analyzer_version");

ALTER TABLE "analyses" ADD CONSTRAINT "analyses_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
