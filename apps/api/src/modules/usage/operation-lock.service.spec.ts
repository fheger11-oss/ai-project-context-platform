import { afterEach, describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../prisma/prisma.service.js";
import { OperationConcurrencyError } from "./errors/operation-concurrency.error.js";
import { OperationLockService } from "./operation-lock.service.js";

function createService(prisma: Partial<PrismaService>) {
  return new OperationLockService(prisma as PrismaService);
}

describe("OperationLockService", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("acquires locks and releases them after success", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const create = vi.fn().mockResolvedValue({});
    const service = createService({
      operationLock: {
        deleteMany,
        create
      }
    } as unknown as PrismaService);

    await expect(
      service.withLocks(
        [{ key: "global:scan", operationType: "scan.global", leaseMs: 60_000 }],
        async () => "ok"
      )
    ).resolves.toBe("ok");

    expect(create).toHaveBeenCalledWith({
      data: {
        key: "global:scan",
        operationType: "scan.global",
        ownerId: expect.any(String),
        acquiredAt: expect.any(Date),
        expiresAt: expect.any(Date)
      }
    });
    expect(deleteMany).toHaveBeenLastCalledWith({
      where: {
        key: "global:scan",
        ownerId: expect.any(String)
      }
    });
  });

  it("releases acquired locks when the operation throws", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const service = createService({
      operationLock: {
        deleteMany,
        create: vi.fn().mockResolvedValue({})
      }
    } as unknown as PrismaService);
    const error = new Error("boom");

    await expect(
      service.withLocks(
        [{ key: "user:user_1:heavy", operationType: "user.heavy", leaseMs: 60_000 }],
        async () => {
          throw error;
        }
      )
    ).rejects.toBe(error);
    expect(deleteMany).toHaveBeenLastCalledWith({
      where: {
        key: "user:user_1:heavy",
        ownerId: expect.any(String)
      }
    });
  });

  it("returns a concurrency error when a non-expired lock already exists", async () => {
    const service = createService({
      operationLock: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockRejectedValue(new Error("unique conflict")),
        findUnique: vi.fn().mockResolvedValue({
          operationType: "analysis.global",
          expiresAt: new Date("2026-09-16T14:31:00.000Z")
        })
      }
    } as unknown as PrismaService);

    await expect(
      service.acquireMany([
        { key: "global:analysis", operationType: "analysis.global", leaseMs: 60_000 }
      ])
    ).rejects.toMatchObject({
      name: "OperationConcurrencyError",
      details: {
        operationType: "analysis.global",
        lockKey: "global:analysis",
        expiresAt: new Date("2026-09-16T14:31:00.000Z")
      }
    } satisfies Partial<OperationConcurrencyError>);
  });

  it("deletes stale matching locks before acquiring", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const service = createService({
      operationLock: {
        deleteMany,
        create: vi.fn().mockResolvedValue({})
      }
    } as unknown as PrismaService);

    await service.acquireMany([
      { key: "repository:repository_1:scan", operationType: "scan.repository", leaseMs: 60_000 }
    ]);

    expect(deleteMany).toHaveBeenNthCalledWith(1, {
      where: {
        key: "repository:repository_1:scan",
        expiresAt: { lte: expect.any(Date) }
      }
    });
  });

  it("renews a lock for the same owner", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const service = createService({
      operationLock: { updateMany }
    } as unknown as PrismaService);
    const now = new Date("2026-09-16T14:30:00.000Z");

    await expect(
      service.renew(
        {
          key: "global:scan",
          operationType: "scan.global",
          ownerId: "owner_1",
          leaseMs: 900_000
        },
        now
      )
    ).resolves.toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        key: "global:scan",
        ownerId: "owner_1",
        expiresAt: { gt: now }
      },
      data: {
        expiresAt: new Date("2026-09-16T14:45:00.000Z")
      }
    });
  });

  it("does not renew a lock owned by another request", async () => {
    const service = createService({
      operationLock: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 })
      }
    } as unknown as PrismaService);

    await expect(
      service.renew({
        key: "global:scan",
        operationType: "scan.global",
        ownerId: "wrong_owner",
        leaseMs: 900_000
      })
    ).resolves.toBe(false);
  });

  it("does not renew a missing lock", async () => {
    const service = createService({
      operationLock: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 })
      }
    } as unknown as PrismaService);

    await expect(
      service.renew({
        key: "missing",
        operationType: "scan.global",
        ownerId: "owner_1",
        leaseMs: 900_000
      })
    ).resolves.toBe(false);
  });

  it("does not renew an already expired lock", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const service = createService({
      operationLock: { updateMany }
    } as unknown as PrismaService);
    const now = new Date("2026-09-16T14:30:00.000Z");

    await expect(
      service.renew(
        {
          key: "global:scan",
          operationType: "scan.global",
          ownerId: "owner_1",
          leaseMs: 900_000
        },
        now
      )
    ).resolves.toBe(false);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          expiresAt: { gt: now }
        })
      })
    );
  });

  it("periodically renews active locks and stops after completion", async () => {
    vi.useFakeTimers();
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const service = createService({
      operationLock: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockResolvedValue({}),
        updateMany
      }
    } as unknown as PrismaService);
    let finishOperation!: (value: string) => void;
    const operation = service.withRenewingLocks(
      [{ key: "global:scan", operationType: "scan.global", leaseMs: 90_000 }],
      async () =>
        new Promise<string>((resolve) => {
          finishOperation = resolve;
        })
    );

    await vi.advanceTimersByTimeAsync(30_000);
    expect(updateMany).toHaveBeenCalledTimes(1);

    finishOperation("done");
    await expect(operation).resolves.toBe("done");

    await vi.advanceTimersByTimeAsync(90_000);
    expect(updateMany).toHaveBeenCalledTimes(1);
  });

  it("stops heartbeat after operation failure", async () => {
    vi.useFakeTimers();
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const service = createService({
      operationLock: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockResolvedValue({}),
        updateMany
      }
    } as unknown as PrismaService);
    const failure = new Error("failed");

    await expect(
      service.withRenewingLocks(
        [{ key: "global:analysis", operationType: "analysis.global", leaseMs: 90_000 }],
        async () => {
          await vi.advanceTimersByTimeAsync(30_000);
          throw failure;
        }
      )
    ).rejects.toBe(failure);

    expect(updateMany).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(90_000);
    expect(updateMany).toHaveBeenCalledTimes(1);
  });

  it("keeps a scan lock alive so a second scan cannot recover it after the original lease", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-16T14:30:00.000Z"));
    const locks = new Map<
      string,
      { operationType: string; ownerId: string; acquiredAt: Date; expiresAt: Date }
    >();
    const service = createService({
      operationLock: {
        deleteMany: vi.fn(
          async (args: { where: { key: string; expiresAt?: { lte: Date }; ownerId?: string } }) => {
            const lock = locks.get(args.where.key);

            if (!lock) {
              return { count: 0 };
            }

            if (args.where.ownerId && lock.ownerId === args.where.ownerId) {
              locks.delete(args.where.key);
              return { count: 1 };
            }

            if (args.where.expiresAt && lock.expiresAt <= args.where.expiresAt.lte) {
              locks.delete(args.where.key);
              return { count: 1 };
            }

            return { count: 0 };
          }
        ),
        create: vi.fn(
          async (args: {
            data: {
              key: string;
              operationType: string;
              ownerId: string;
              acquiredAt: Date;
              expiresAt: Date;
            };
          }) => {
            if (locks.has(args.data.key)) {
              throw new Error("unique conflict");
            }

            locks.set(args.data.key, {
              operationType: args.data.operationType,
              ownerId: args.data.ownerId,
              acquiredAt: args.data.acquiredAt,
              expiresAt: args.data.expiresAt
            });
          }
        ),
        updateMany: vi.fn(
          async (args: {
            where: { key: string; ownerId: string; expiresAt: { gt: Date } };
            data: { expiresAt: Date };
          }) => {
            const lock = locks.get(args.where.key);

            if (
              !lock ||
              lock.ownerId !== args.where.ownerId ||
              lock.expiresAt <= args.where.expiresAt.gt
            ) {
              return { count: 0 };
            }

            lock.expiresAt = args.data.expiresAt;
            return { count: 1 };
          }
        ),
        findUnique: vi.fn(async (args: { where: { key: string } }) => {
          const lock = locks.get(args.where.key);

          return lock ? { operationType: lock.operationType, expiresAt: lock.expiresAt } : null;
        })
      }
    } as unknown as PrismaService);
    let finishOperation!: () => void;
    const firstScan = service.withRenewingLocks(
      [{ key: "global:scan", operationType: "scan.global", leaseMs: 90_000 }],
      async () =>
        new Promise<void>((resolve) => {
          finishOperation = resolve;
        })
    );

    await vi.advanceTimersByTimeAsync(100_000);

    await expect(
      service.acquireMany([{ key: "global:scan", operationType: "scan.global", leaseMs: 90_000 }])
    ).rejects.toBeInstanceOf(OperationConcurrencyError);

    finishOperation();
    await firstScan;
  });
});
