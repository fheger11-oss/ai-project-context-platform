-- CreateEnum
CREATE TYPE "ScanLimitFailureReason" AS ENUM ('FILE_COUNT_LIMIT', 'INDIVIDUAL_FILE_SIZE_LIMIT', 'TOTAL_SIZE_LIMIT');

-- AlterTable
ALTER TABLE "scans"
ADD COLUMN "files_processed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "total_bytes_considered" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN "scan_limit_reason" "ScanLimitFailureReason";

-- Backfill existing successful scan usage from legacy snapshot totals.
UPDATE "scans"
SET "files_processed" = "total_files",
    "total_bytes_considered" = "total_size";
