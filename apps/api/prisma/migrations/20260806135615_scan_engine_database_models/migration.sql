-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "scans" (
    "id" TEXT NOT NULL,
    "repository_id" TEXT NOT NULL,
    "status" "ScanStatus" NOT NULL DEFAULT 'PENDING',
    "commit_sha" TEXT NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "total_files" INTEGER NOT NULL DEFAULT 0,
    "total_size" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_files" (
    "id" TEXT NOT NULL,
    "scan_id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "extension" TEXT,
    "size" BIGINT NOT NULL,
    "sha" TEXT NOT NULL,
    "is_binary" BOOLEAN NOT NULL DEFAULT false,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scan_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scans_repository_id_idx" ON "scans"("repository_id");

-- CreateIndex
CREATE INDEX "scans_status_idx" ON "scans"("status");

-- CreateIndex
CREATE INDEX "scans_commit_sha_idx" ON "scans"("commit_sha");

-- CreateIndex
CREATE INDEX "scan_files_scan_id_idx" ON "scan_files"("scan_id");

-- CreateIndex
CREATE INDEX "scan_files_path_idx" ON "scan_files"("path");

-- CreateIndex
CREATE UNIQUE INDEX "scan_files_scan_id_path_key" ON "scan_files"("scan_id", "path");

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_files" ADD CONSTRAINT "scan_files_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
