-- V1 production protection primitives.
-- Existing workflow tables remain the source of truth for persisted workflow usage.

CREATE TABLE "operation_locks" (
  "key" TEXT NOT NULL,
  "operation_type" TEXT NOT NULL,
  "owner_id" TEXT NOT NULL,
  "acquired_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "operation_locks_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "operation_locks_operation_type_idx" ON "operation_locks"("operation_type");
CREATE INDEX "operation_locks_owner_id_idx" ON "operation_locks"("owner_id");
CREATE INDEX "operation_locks_expires_at_idx" ON "operation_locks"("expires_at");

CREATE TABLE "usage_events" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,

  CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "usage_events_user_id_resource_created_at_idx"
  ON "usage_events"("user_id", "resource", "created_at");

ALTER TABLE "usage_events"
  ADD CONSTRAINT "usage_events_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
