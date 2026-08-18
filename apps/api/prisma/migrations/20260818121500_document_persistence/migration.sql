CREATE TYPE "DocumentType" AS ENUM ('PROJECT_OVERVIEW');

CREATE TYPE "DocumentFormat" AS ENUM ('MARKDOWN');

CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "project_context_id" TEXT NOT NULL,
    "context_id" TEXT NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "format" "DocumentFormat" NOT NULL,
    "generator_version" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "documents_project_context_id_idx" ON "documents"("project_context_id");
CREATE INDEX "documents_context_id_idx" ON "documents"("context_id");
CREATE INDEX "documents_document_type_format_idx" ON "documents"("document_type", "format");
CREATE INDEX "documents_generator_version_idx" ON "documents"("generator_version");

ALTER TABLE "documents" ADD CONSTRAINT "documents_project_context_id_fkey" FOREIGN KEY ("project_context_id") REFERENCES "project_contexts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
