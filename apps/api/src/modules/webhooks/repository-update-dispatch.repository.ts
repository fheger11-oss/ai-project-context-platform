import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class RepositoryUpdateDispatchRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async claim(workerId: string, now: Date, leaseUntil: Date) {
    for (let tries = 0; tries < 5; tries += 1) {
      const candidate = await this.prisma.repositoryUpdateDispatch.findFirst({
        where: {
          OR: [
            { status: "PENDING", nextAttemptAt: { lte: now } },
            { status: "PROCESSING", leaseUntil: { lt: now } }
          ]
        },
        orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
        select: { id: true }
      });
      if (!candidate) return null;
      const claimed = await this.prisma.repositoryUpdateDispatch.updateMany({
        where: {
          id: candidate.id,
          OR: [
            { status: "PENDING", nextAttemptAt: { lte: now } },
            { status: "PROCESSING", leaseUntil: { lt: now } }
          ]
        },
        data: {
          status: "PROCESSING",
          claimedBy: workerId,
          leaseUntil,
          startedAt: now,
          attemptCount: { increment: 1 }
        }
      });
      if (claimed.count === 1)
        return this.prisma.repositoryUpdateDispatch.findUnique({
          where: { id: candidate.id },
          include: { webhookDelivery: true }
        });
    }
    return null;
  }

  renew(id: string, workerId: string, leaseUntil: Date) {
    return this.prisma.repositoryUpdateDispatch.updateMany({
      where: { id, status: "PROCESSING", claimedBy: workerId },
      data: { leaseUntil }
    });
  }

  finish(
    id: string,
    workerId: string,
    status: "COMPLETED" | "IGNORED",
    repositoryUpdateId?: string
  ) {
    return this.prisma.repositoryUpdateDispatch.updateMany({
      where: { id, status: "PROCESSING", claimedBy: workerId },
      data: {
        status,
        completedAt: new Date(),
        leaseUntil: null,
        claimedBy: null,
        ...(repositoryUpdateId ? { repositoryUpdateId } : {}),
        lastFailureCategory: null
      }
    });
  }

  retry(id: string, workerId: string, nextAttemptAt: Date, category: string) {
    return this.prisma.repositoryUpdateDispatch.updateMany({
      where: { id, status: "PROCESSING", claimedBy: workerId },
      data: {
        status: "PENDING",
        nextAttemptAt,
        leaseUntil: null,
        claimedBy: null,
        lastFailureCategory: category
      }
    });
  }

  fail(id: string, workerId: string, category: string) {
    return this.prisma.repositoryUpdateDispatch.updateMany({
      where: { id, status: "PROCESSING", claimedBy: workerId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        leaseUntil: null,
        claimedBy: null,
        lastFailureCategory: category
      }
    });
  }
}
