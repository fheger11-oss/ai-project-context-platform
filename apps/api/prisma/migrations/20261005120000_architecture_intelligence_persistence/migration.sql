-- V4.1 Sprint 1: architecture-specific persistence foundation.
CREATE TYPE "ArchitectureProcessingStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'INCOMPATIBLE'
);

CREATE TYPE "ArchitectureConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TABLE "architecture_processing_requests" (
  "id" TEXT NOT NULL,
  "repository_id" TEXT NOT NULL,
  "project_context_id" TEXT NOT NULL,
  "processor_version" TEXT NOT NULL,
  "status" "ArchitectureProcessingStatus" NOT NULL DEFAULT 'PENDING',
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "claimed_by" TEXT,
  "lease_until" TIMESTAMP(3),
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "last_failure_category" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "architecture_processing_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "architecture_finding_occurrences" (
  "id" TEXT NOT NULL,
  "repository_id" TEXT NOT NULL,
  "project_context_id" TEXT NOT NULL,
  "processing_request_id" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "rule_id" TEXT NOT NULL,
  "rule_version" TEXT NOT NULL,
  "confidence" "ArchitectureConfidence" NOT NULL,
  "subject" JSONB NOT NULL,
  "evidence" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "architecture_finding_occurrences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "architecture_module_measurements" (
  "id" TEXT NOT NULL,
  "repository_id" TEXT NOT NULL,
  "project_context_id" TEXT NOT NULL,
  "processing_request_id" TEXT NOT NULL,
  "module_id" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "confidence" "ArchitectureConfidence" NOT NULL,
  "source_file_count" INTEGER NOT NULL,
  "declaration_count" INTEGER NOT NULL,
  "fan_in" INTEGER NOT NULL,
  "fan_out" INTEGER NOT NULL,
  "total_degree" INTEGER NOT NULL,
  "relationship_count" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "architecture_module_measurements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "architecture_processing_requests_project_context_id_processor_version_key"
  ON "architecture_processing_requests"("project_context_id", "processor_version");
CREATE UNIQUE INDEX "architecture_processing_requests_id_project_context_id_repository_id_key"
  ON "architecture_processing_requests"("id", "project_context_id", "repository_id");
CREATE INDEX "architecture_processing_requests_status_next_attempt_at_idx"
  ON "architecture_processing_requests"("status", "next_attempt_at");
CREATE INDEX "architecture_processing_requests_status_lease_until_idx"
  ON "architecture_processing_requests"("status", "lease_until");
CREATE INDEX "architecture_processing_requests_repository_id_created_at_id_idx"
  ON "architecture_processing_requests"("repository_id", "created_at", "id");
CREATE INDEX "architecture_processing_requests_repository_id_project_context_id_idx"
  ON "architecture_processing_requests"("repository_id", "project_context_id");

CREATE UNIQUE INDEX "architecture_finding_occurrences_processing_request_id_fingerprint_key"
  ON "architecture_finding_occurrences"("processing_request_id", "fingerprint");
CREATE INDEX "architecture_finding_occurrences_repository_id_project_context_id_created_at_id_idx"
  ON "architecture_finding_occurrences"("repository_id", "project_context_id", "created_at", "id");
CREATE INDEX "architecture_finding_occurrences_processing_request_id_idx"
  ON "architecture_finding_occurrences"("processing_request_id");
CREATE INDEX "architecture_finding_occurrences_repository_id_fingerprint_idx"
  ON "architecture_finding_occurrences"("repository_id", "fingerprint");

CREATE UNIQUE INDEX "architecture_module_measurements_processing_request_id_module_id_key"
  ON "architecture_module_measurements"("processing_request_id", "module_id");
CREATE INDEX "architecture_module_measurements_repository_id_project_context_id_created_at_id_idx"
  ON "architecture_module_measurements"("repository_id", "project_context_id", "created_at", "id");
CREATE INDEX "architecture_module_measurements_processing_request_id_idx"
  ON "architecture_module_measurements"("processing_request_id");

ALTER TABLE "architecture_processing_requests"
  ADD CONSTRAINT "architecture_processing_requests_repository_id_fkey"
  FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "architecture_processing_requests"
  ADD CONSTRAINT "architecture_processing_requests_project_context_id_repository_id_fkey"
  FOREIGN KEY ("project_context_id", "repository_id")
  REFERENCES "project_contexts"("id", "repository_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "architecture_finding_occurrences"
  ADD CONSTRAINT "architecture_finding_occurrences_repository_id_fkey"
  FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "architecture_finding_occurrences"
  ADD CONSTRAINT "architecture_finding_occurrences_project_context_id_repository_id_fkey"
  FOREIGN KEY ("project_context_id", "repository_id")
  REFERENCES "project_contexts"("id", "repository_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "architecture_finding_occurrences"
  ADD CONSTRAINT "architecture_finding_occurrences_processing_request_id_project_context_id_repository_id_fkey"
  FOREIGN KEY ("processing_request_id", "project_context_id", "repository_id")
  REFERENCES "architecture_processing_requests"("id", "project_context_id", "repository_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "architecture_module_measurements"
  ADD CONSTRAINT "architecture_module_measurements_repository_id_fkey"
  FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "architecture_module_measurements"
  ADD CONSTRAINT "architecture_module_measurements_project_context_id_repository_id_fkey"
  FOREIGN KEY ("project_context_id", "repository_id")
  REFERENCES "project_contexts"("id", "repository_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "architecture_module_measurements"
  ADD CONSTRAINT "architecture_module_measurements_processing_request_id_project_context_id_repository_id_fkey"
  FOREIGN KEY ("processing_request_id", "project_context_id", "repository_id")
  REFERENCES "architecture_processing_requests"("id", "project_context_id", "repository_id")
  ON DELETE CASCADE ON UPDATE CASCADE;
