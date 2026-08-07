import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../prisma/prisma.service.js";
import { PrismaScanRepository } from "./prisma-scan.repository.js";

describe("PrismaScanRepository", () => {
  it("maps Prisma scan records into ScanSnapshot contract models", async () => {
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
});
