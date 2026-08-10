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

  it("lists scan history using repository filtering, deterministic ordering, and database pagination", async () => {
    const newerScan = {
      ...prismaScan,
      id: "scan_2",
      status: "FAILED",
      commitSha: "def456",
      createdAt: new Date("2026-08-07T11:00:00.000Z")
    };
    const findMany = vi.fn().mockResolvedValue([newerScan, prismaScan]);
    const count = vi.fn().mockResolvedValue(42);
    const scanFileFindMany = vi.fn();
    const prisma = {
      scan: {
        findMany,
        count
      },
      scanFile: {
        findMany: scanFileFindMany
      },
      $transaction: vi.fn(async (queries: Array<Promise<unknown>>) => Promise.all(queries))
    } as unknown as PrismaService;
    const repository = new PrismaScanRepository(prisma);

    await expect(
      repository.listScanHistory({
        repositoryId: "repository_1",
        page: 3,
        pageSize: 10
      })
    ).resolves.toEqual({
      items: [
        {
          id: "scan_2",
          repositoryId: "repository_1",
          status: "FAILED",
          commitSha: "def456",
          startedAt: null,
          completedAt: null,
          durationMs: null,
          totalFiles: 12,
          totalSize: 2048n,
          createdAt: new Date("2026-08-07T11:00:00.000Z"),
          updatedAt
        },
        {
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
        }
      ],
      totalItems: 42
    });

    expect(findMany).toHaveBeenCalledWith({
      where: { repositoryId: "repository_1" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: 20,
      take: 10
    });
    expect(count).toHaveBeenCalledWith({
      where: { repositoryId: "repository_1" }
    });
    expect(scanFileFindMany).not.toHaveBeenCalled();
  });

  it("returns persisted scan statuses in history without filtering lifecycle states", async () => {
    const scans = [
      { ...prismaScan, id: "completed_scan", status: "COMPLETED" },
      { ...prismaScan, id: "failed_scan", status: "FAILED" },
      { ...prismaScan, id: "cancelled_scan", status: "CANCELLED" }
    ];
    const prisma = {
      scan: {
        findMany: vi.fn().mockResolvedValue(scans),
        count: vi.fn().mockResolvedValue(scans.length)
      },
      $transaction: vi.fn(async (queries: Array<Promise<unknown>>) => Promise.all(queries))
    } as unknown as PrismaService;
    const repository = new PrismaScanRepository(prisma);

    const history = await repository.listScanHistory({
      repositoryId: "repository_1",
      page: 1,
      pageSize: 20
    });

    expect(history.items.map((scan) => scan.status)).toEqual(["COMPLETED", "FAILED", "CANCELLED"]);
  });
});
