import { Inject, Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import { PrismaService } from "../prisma/prisma.service.js";
import { OperationConcurrencyError } from "./errors/operation-concurrency.error.js";

export type OperationLockSpec = {
  key: string;
  operationType: string;
  leaseMs: number;
};

type AcquiredOperationLock = OperationLockSpec & {
  ownerId: string;
};

type OperationHeartbeat = {
  stop: () => void;
};

@Injectable()
export class OperationLockService {
  private readonly logger = new Logger(OperationLockService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Lock order for V1 heavy work is: global lock, user lock, resource lock.
   * Callers pass locks in that order and this service releases in reverse order.
   */
  async withLocks<T>(locks: readonly OperationLockSpec[], operation: () => Promise<T>): Promise<T> {
    const acquired = await this.acquireMany(locks);

    try {
      return await operation();
    } finally {
      await this.releaseMany(acquired);
    }
  }

  async withRenewingLocks<T>(
    locks: readonly OperationLockSpec[],
    operation: () => Promise<T>
  ): Promise<T> {
    const acquired = await this.acquireMany(locks);
    const heartbeat = this.startHeartbeat(acquired);

    try {
      return await operation();
    } finally {
      heartbeat.stop();
      await this.releaseMany(acquired);
    }
  }

  async acquireMany(locks: readonly OperationLockSpec[]): Promise<AcquiredOperationLock[]> {
    const ownerId = randomUUID();
    const acquired: AcquiredOperationLock[] = [];

    try {
      for (const lock of locks) {
        await this.acquire(lock, ownerId);
        acquired.push({ ...lock, ownerId });
      }
    } catch (error) {
      await this.releaseMany(acquired);
      throw error;
    }

    return acquired;
  }

  async renew(lock: AcquiredOperationLock, now = new Date()): Promise<boolean> {
    const renewed = await this.prisma.operationLock.updateMany({
      where: {
        key: lock.key,
        ownerId: lock.ownerId,
        expiresAt: { gt: now }
      },
      data: {
        expiresAt: new Date(now.getTime() + lock.leaseMs)
      }
    });

    return renewed.count === 1;
  }

  async releaseMany(locks: readonly AcquiredOperationLock[]): Promise<void> {
    for (const lock of [...locks].reverse()) {
      await this.release(lock);
    }
  }

  private startHeartbeat(locks: readonly AcquiredOperationLock[]): OperationHeartbeat {
    if (locks.length === 0) {
      return { stop: () => undefined };
    }

    let stopped = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const renewalIntervalMs = this.renewalIntervalMs(locks);

    const schedule = () => {
      if (stopped) {
        return;
      }

      timeout = setTimeout(() => {
        void renewAndReschedule();
      }, renewalIntervalMs);
      timeout.unref?.();
    };

    const renewAndReschedule = async () => {
      try {
        await this.renewAll(locks);
      } catch (error) {
        this.logger.warn(
          `Operation lock heartbeat failed operationTypes=${this.operationTypes(locks)} errorName=${this.errorName(error)}`
        );
      } finally {
        schedule();
      }
    };

    schedule();

    return {
      stop: () => {
        stopped = true;
        if (timeout) {
          clearTimeout(timeout);
        }
      }
    };
  }

  private async renewAll(locks: readonly AcquiredOperationLock[]): Promise<void> {
    for (const lock of locks) {
      const renewed = await this.renew(lock);

      if (!renewed) {
        this.logger.warn(
          `Operation lock heartbeat could not renew operationType=${lock.operationType} key=${lock.key}`
        );
      }
    }
  }

  private renewalIntervalMs(locks: readonly AcquiredOperationLock[]): number {
    const shortestLeaseMs = Math.min(...locks.map((lock) => lock.leaseMs));

    return Math.max(30_000, Math.floor(shortestLeaseMs / 3));
  }

  private operationTypes(locks: readonly AcquiredOperationLock[]): string {
    return Array.from(new Set(locks.map((lock) => lock.operationType))).join(",");
  }

  private async acquire(lock: OperationLockSpec, ownerId: string): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + lock.leaseMs);

    await this.prisma.operationLock.deleteMany({
      where: {
        key: lock.key,
        expiresAt: { lte: now }
      }
    });

    try {
      await this.prisma.operationLock.create({
        data: {
          key: lock.key,
          operationType: lock.operationType,
          ownerId,
          acquiredAt: now,
          expiresAt
        }
      });
    } catch {
      const existing = await this.prisma.operationLock.findUnique({
        where: { key: lock.key },
        select: {
          operationType: true,
          expiresAt: true
        }
      });

      throw new OperationConcurrencyError({
        operationType: existing?.operationType ?? lock.operationType,
        lockKey: lock.key,
        expiresAt: existing?.expiresAt ?? null
      });
    }
  }

  private async release(lock: AcquiredOperationLock): Promise<void> {
    try {
      await this.prisma.operationLock.deleteMany({
        where: {
          key: lock.key,
          ownerId: lock.ownerId
        }
      });
    } catch (error) {
      this.logger.warn(
        `Operation lock release failed operationType=${lock.operationType} key=${lock.key} errorName=${this.errorName(error)}`
      );
    }
  }

  private errorName(error: unknown): string {
    return error instanceof Error ? error.name : typeof error;
  }
}
