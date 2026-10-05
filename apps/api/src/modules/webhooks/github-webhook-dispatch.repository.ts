import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service.js";

export type AcceptedWebhook = {
  deliveryId: string;
  eventType: string;
  providerRepositoryId: string;
  repositoryFullName: string;
  branch: string;
  targetCommitSha: string;
  occurredAt?: Date;
  repositoryIds: string[];
};

@Injectable()
export class GitHubWebhookDispatchRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findConnectedRepositories(providerRepositoryId: string) {
    return this.prisma.repository.findMany({
      where: { githubId: providerRepositoryId },
      select: { id: true, fullName: true, defaultBranch: true }
    });
  }

  async accept(input: AcceptedWebhook): Promise<{ duplicate: boolean; dispatchCount: number }> {
    try {
      const delivery = await this.prisma.repositoryWebhookDelivery.create({
        data: {
          provider: "GITHUB",
          deliveryId: input.deliveryId,
          eventType: input.eventType,
          providerRepositoryId: input.providerRepositoryId,
          repositoryFullName: input.repositoryFullName,
          branch: input.branch,
          targetCommitSha: input.targetCommitSha,
          ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
          dispatches: { create: input.repositoryIds.map((repositoryId) => ({ repositoryId })) }
        },
        include: { _count: { select: { dispatches: true } } }
      });
      return { duplicate: false, dispatchCount: delivery._count.dispatches };
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      const existing = await this.prisma.repositoryWebhookDelivery.findUnique({
        where: { provider_deliveryId: { provider: "GITHUB", deliveryId: input.deliveryId } },
        select: {
          eventType: true,
          providerRepositoryId: true,
          repositoryFullName: true,
          branch: true,
          targetCommitSha: true,
          _count: { select: { dispatches: true } }
        }
      });
      if (
        !existing ||
        existing.eventType !== input.eventType ||
        existing.providerRepositoryId !== input.providerRepositoryId ||
        existing.repositoryFullName.toLowerCase() !== input.repositoryFullName.toLowerCase() ||
        existing.branch !== input.branch ||
        existing.targetCommitSha !== input.targetCommitSha
      ) {
        throw new Error("WEBHOOK_DELIVERY_CONFLICT", { cause: error });
      }
      return { duplicate: true, dispatchCount: existing._count.dispatches };
    }
  }
}

function isUniqueConstraintError(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
