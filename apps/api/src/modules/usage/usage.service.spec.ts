import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../prisma/prisma.service.js";
import type { QuotaExceededError } from "./errors/quota-exceeded.error.js";
import { UsageService } from "./usage.service.js";

function createService(prisma: Partial<PrismaService>) {
  return new UsageService(prisma as PrismaService);
}

describe("UsageService", () => {
  it("uses UTC calendar month boundaries for monthly quotas", async () => {
    const count = vi.fn().mockResolvedValue(2);
    const service = createService({
      scan: { count }
    } as unknown as PrismaService);

    await expect(
      service.assertMonthlyQuota({
        userId: "user_1",
        resource: "scans",
        limit: 3,
        now: new Date("2026-09-16T14:30:00.000Z")
      })
    ).resolves.toEqual({
      startsAt: new Date("2026-09-01T00:00:00.000Z"),
      resetAt: new Date("2026-10-01T00:00:00.000Z")
    });
    expect(count).toHaveBeenCalledWith({
      where: {
        createdAt: {
          gte: new Date("2026-09-01T00:00:00.000Z"),
          lt: new Date("2026-10-01T00:00:00.000Z")
        },
        repository: { userId: "user_1" }
      }
    });
  });

  it("returns a machine-readable quota error when a monthly limit is exhausted", async () => {
    const service = createService({
      analysis: { count: vi.fn().mockResolvedValue(3) }
    } as unknown as PrismaService);

    await expect(
      service.assertMonthlyQuota({
        userId: "user_1",
        resource: "analyses",
        limit: 3,
        now: new Date("2026-09-16T14:30:00.000Z")
      })
    ).rejects.toMatchObject({
      name: "QuotaExceededError",
      details: {
        resource: "analyses",
        limit: 3,
        currentUsage: 3,
        resetAt: new Date("2026-10-01T00:00:00.000Z")
      }
    } satisfies Partial<QuotaExceededError>);
  });

  it("does not count reconnecting an existing GitHub repository against repository quota", async () => {
    const count = vi.fn();
    const service = createService({
      repository: {
        findUnique: vi.fn().mockResolvedValue({ id: "repository_1" }),
        count
      }
    } as unknown as PrismaService);

    await expect(
      service.assertRepositoryQuota({ userId: "user_1", githubId: "github_1" })
    ).resolves.toBeUndefined();
    expect(count).not.toHaveBeenCalled();
  });

  it("records successful AI export usage as a lightweight usage event", async () => {
    const create = vi.fn().mockResolvedValue({});
    const service = createService({
      usageEvent: { create }
    } as unknown as PrismaService);

    await service.recordAiExportUsage({
      userId: "user_1",
      contextId: "context_1",
      format: "MARKDOWN",
      createdAt: new Date("2026-09-16T14:30:00.000Z")
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        userId: "user_1",
        resource: "aiExports",
        createdAt: new Date("2026-09-16T14:30:00.000Z"),
        metadata: {
          contextId: "context_1",
          format: "MARKDOWN"
        }
      }
    });
  });
});
