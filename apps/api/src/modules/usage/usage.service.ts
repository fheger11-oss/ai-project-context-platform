import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service.js";
import { QuotaExceededError, type UsageQuotaResource } from "./errors/quota-exceeded.error.js";
import { utcCalendarMonthPeriod, type UsagePeriod } from "./usage-period.js";
import { V1_USAGE_LIMITS } from "./v1-usage-limits.js";

type MonthlyQuotaInput = {
  userId: string;
  resource: Exclude<UsageQuotaResource, "repositories">;
  limit: number;
  now?: Date;
};

type RepositoryQuotaInput = {
  userId: string;
  githubId?: string;
};

@Injectable()
export class UsageService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  currentUtcMonth(now = new Date()): UsagePeriod {
    return utcCalendarMonthPeriod(now);
  }

  async assertRepositoryQuota(input: RepositoryQuotaInput): Promise<void> {
    if (input.githubId) {
      const existing = await this.prisma.repository.findUnique({
        where: {
          userId_githubId: {
            userId: input.userId,
            githubId: input.githubId
          }
        },
        select: { id: true }
      });

      if (existing) {
        return;
      }
    }

    const currentUsage = await this.prisma.repository.count({
      where: { userId: input.userId }
    });

    this.assertWithinLimit({
      resource: "repositories",
      limit: V1_USAGE_LIMITS.repositories,
      currentUsage,
      resetAt: null
    });
  }

  async assertMonthlyQuota(input: MonthlyQuotaInput): Promise<UsagePeriod> {
    const period = this.currentUtcMonth(input.now);
    const currentUsage = await this.countMonthlyUsage({
      userId: input.userId,
      resource: input.resource,
      period
    });

    this.assertWithinLimit({
      resource: input.resource,
      limit: input.limit,
      currentUsage,
      resetAt: period.resetAt
    });

    return period;
  }

  async recordAiExportUsage(input: {
    userId: string;
    contextId: string;
    format: string;
    createdAt?: Date;
  }): Promise<void> {
    await this.prisma.usageEvent.create({
      data: {
        userId: input.userId,
        resource: "aiExports",
        ...(input.createdAt ? { createdAt: input.createdAt } : {}),
        metadata: {
          contextId: input.contextId,
          format: input.format
        }
      }
    });
  }

  private async countMonthlyUsage(input: {
    userId: string;
    resource: Exclude<UsageQuotaResource, "repositories">;
    period: UsagePeriod;
  }): Promise<number> {
    const createdAt = {
      gte: input.period.startsAt,
      lt: input.period.resetAt
    };

    switch (input.resource) {
      case "scans":
        return this.prisma.scan.count({
          where: {
            createdAt,
            repository: { userId: input.userId }
          }
        });
      case "analyses":
        return this.prisma.analysis.count({
          where: {
            createdAt,
            repository: { userId: input.userId }
          }
        });
      case "contexts":
        return this.prisma.projectContext.count({
          where: {
            createdAt,
            repository: { userId: input.userId }
          }
        });
      case "documents":
        return this.prisma.document.count({
          where: {
            createdAt,
            projectContext: {
              repository: { userId: input.userId }
            }
          }
        });
      case "aiExports":
        return this.prisma.usageEvent.count({
          where: {
            userId: input.userId,
            resource: "aiExports",
            createdAt
          }
        });
    }
  }

  private assertWithinLimit(input: {
    resource: UsageQuotaResource;
    limit: number;
    currentUsage: number;
    resetAt: Date | null;
  }): void {
    if (input.currentUsage >= input.limit) {
      throw new QuotaExceededError(input);
    }
  }
}
