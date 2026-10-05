-- V2.3-A: make repository context history explicit and durable.
CREATE TABLE "repository_context_history" (
    "id" TEXT NOT NULL,
    "repository_id" TEXT NOT NULL,
    "project_context_id" TEXT NOT NULL,
    "commit_sha" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repository_context_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "repository_context_history_repository_id_project_context_id_key"
  ON "repository_context_history"("repository_id", "project_context_id");
CREATE INDEX "repository_context_history_repository_id_created_at_id_idx"
  ON "repository_context_history"("repository_id", "created_at", "id");
CREATE INDEX "repository_context_history_project_context_id_idx"
  ON "repository_context_history"("project_context_id");

-- The composite key makes repository ownership part of the context reference.
CREATE UNIQUE INDEX "project_contexts_id_repository_id_key"
  ON "project_contexts"("id", "repository_id");

ALTER TABLE "repository_context_history"
  ADD CONSTRAINT "repository_context_history_repository_id_fkey"
  FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "repository_context_history"
  ADD CONSTRAINT "repository_context_history_project_context_id_repository_id_fkey"
  FOREIGN KEY ("project_context_id", "repository_id")
  REFERENCES "project_contexts"("id", "repository_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve every context that was already explicitly current before this migration.
INSERT INTO "repository_context_history" ("id", "repository_id", "project_context_id", "commit_sha")
SELECT
  'repository_context_history_' || rs."id",
  rs."repository_id",
  rs."current_project_context_id",
  pc."commit_sha"
FROM "repository_states" rs
JOIN "project_contexts" pc
  ON pc."id" = rs."current_project_context_id"
 AND pc."repository_id" = rs."repository_id"
WHERE rs."current_project_context_id" IS NOT NULL
ON CONFLICT ("repository_id", "project_context_id") DO NOTHING;
