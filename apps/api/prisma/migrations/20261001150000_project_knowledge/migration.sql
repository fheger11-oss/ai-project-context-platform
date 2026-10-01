-- CreateEnum
CREATE TYPE "ProjectKnowledgeStatus" AS ENUM ('ACTIVE', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProjectKnowledgeOrigin" AS ENUM ('USER_AUTHORED', 'SYSTEM_DERIVED');

-- CreateEnum
CREATE TYPE "ProjectKnowledgeKind" AS ENUM ('USER_ASSERTED', 'OBSERVED', 'INFERRED');

-- CreateEnum
CREATE TYPE "ProjectKnowledgeSourceType" AS ENUM ('USER', 'REPOSITORY', 'PROJECT_CONTEXT', 'PROJECT_DECISION');

-- CreateEnum
CREATE TYPE "ProjectKnowledgeConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateIndex required by the repository-scoped ProjectDecision provenance relation.
CREATE UNIQUE INDEX "project_decisions_id_repository_id_key" ON "project_decisions"("id", "repository_id");

-- CreateTable
CREATE TABLE "project_knowledge" (
    "id" TEXT NOT NULL,
    "repository_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "ProjectKnowledgeStatus" NOT NULL DEFAULT 'ACTIVE',
    "origin" "ProjectKnowledgeOrigin" NOT NULL DEFAULT 'USER_AUTHORED',
    "kind" "ProjectKnowledgeKind" NOT NULL DEFAULT 'USER_ASSERTED',
    "source_type" "ProjectKnowledgeSourceType" NOT NULL DEFAULT 'USER',
    "confidence" "ProjectKnowledgeConfidence",
    "source_project_context_id" TEXT,
    "source_project_decision_id" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_knowledge_repository_id_status_created_at_id_idx" ON "project_knowledge"("repository_id", "status", "created_at", "id");

-- CreateIndex
CREATE INDEX "project_knowledge_source_project_context_id_idx" ON "project_knowledge"("source_project_context_id");

-- CreateIndex
CREATE INDEX "project_knowledge_source_project_decision_id_idx" ON "project_knowledge"("source_project_decision_id");

-- AddForeignKey
ALTER TABLE "project_knowledge" ADD CONSTRAINT "project_knowledge_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_knowledge" ADD CONSTRAINT "project_knowledge_source_project_context_id_repository_id_fkey" FOREIGN KEY ("source_project_context_id", "repository_id") REFERENCES "project_contexts"("id", "repository_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_knowledge" ADD CONSTRAINT "project_knowledge_source_project_decision_id_repository_id_fkey" FOREIGN KEY ("source_project_decision_id", "repository_id") REFERENCES "project_decisions"("id", "repository_id") ON DELETE RESTRICT ON UPDATE CASCADE;
