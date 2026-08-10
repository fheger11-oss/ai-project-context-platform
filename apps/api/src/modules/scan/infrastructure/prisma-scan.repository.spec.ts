import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../prisma/prisma.service.js";
import { PrismaScanRepository } from "./prisma-scan.repository.js";

const createdAt = new Date("2026-08-07T10:00:00.000Z");
const updatedAt = new Date("2026-08-07T10:00:01.000Z");

const prismaScan = {
  id: "scan_1",
  repositoryId: "repository_1",
  status: "COMPLETED",
  commitSha: "abc123",
  startedAt: null,
  completedAt: null,
  durationMs: null,
  totalFiles: 12,
  totalSize: 2048n,
  createdAt,
  updatedAt
};

describe("PrismaScanRepository", () => {
  it("maps Prisma scan records into ScanSnapshot contract models", async () => {
    const prisma = {
      scan: {
        create: vi.fn().mockResolvedValue(prismaScan)
      }
    } as unknown as PrismaService;
    const repository = new PrismaScanRepository(prisma);

    await expect(
      repository.createScan({
        repositoryId: "repository_1",
        commitSha: "abc123"
      })
    ).resolves.toEqual({
      id: "scan_1",
      repositoryId: "repository_1",
      status: "COMPLETED",
      commitSha: "abc123",
      startedAt: null,
      completedAt: null,
      durationMs: null,
      totalFiles: 12,
      totalSize: 2048n,
      createdAt,
      updatedAt
    });
  });

  it("finds a completed scan by repository and commit", async () => {
    const prisma = {
      scan: {
        findFirst: vi.fn().mockResolvedValue(prismaScan)
      }
    } as unknown as PrismaService;
    const repository = new PrismaScanRepository(prisma);

    await expect(
      repository.findCompletedScanByRepositoryAndCommit("repository_1", "abc123")
    ).resolves.toEqual({
      id: "scan_1",
      repositoryId: "repository_1",
      status: "COMPLETED",
      commitSha: "abc123",
      startedAt: null,
      completedAt: null,
      durationMs: null,
      totalFiles: 12,
      totalSize: 2048n,
      createdAt,
      updatedAt
    });
    expect(prisma.scan.findFirst).toHaveBeenCalledWith({
      where: {
        repositoryId: "repository_1",
        commitSha: "abc123",
        status: "COMPLETED"
      },
      orderBy: { createdAt: "desc" }
    });
  });

  it("does not return non-completed scans as reusable duplicates", async () => {
    const prisma = {
      scan: {
        findFirst: vi.fn().mockResolvedValue(null)
      }
    } as unknown as PrismaService;
    const repository = new PrismaScanRepository(prisma);

    await expect(
      repository.findCompletedScanByRepositoryAndCommit("repository_1", "abc123")
    ).resolves.toBeNull();
    expect(prisma.scan.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "COMPLETED"
        })
      })
    );
  });

  it("applies repository and commit filtering when looking up reusable scans", async () => {
    const prisma = {
      scan: {
        findFirst: vi.fn().mockResolvedValue(null)
      }
    } as unknown as PrismaService;
    const repository = new PrismaScanRepository(prisma);

    await repository.findCompletedScanByRepositoryAndCommit("repository_2", "def456");

    expect(prisma.scan.findFirst).toHaveBeenCalledWith({
      where: {
        repositoryId: "repository_2",
        commitSha: "def456",
        status: "COMPLETED"
      },
      orderBy: { createdAt: "desc" }
    });
  });
});
