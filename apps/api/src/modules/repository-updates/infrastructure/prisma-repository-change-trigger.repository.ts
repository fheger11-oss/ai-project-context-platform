import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service.js";
import type {
  ConnectedRepositoryTriggerMetadata,
  RepositoryChangeTriggerRepository
} from "../domain/contracts/repository-change-trigger-repository.contract.js";

@Injectable()
export class PrismaRepositoryChangeTriggerRepository implements RepositoryChangeTriggerRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findConnectedById(
    repositoryId: string
  ): Promise<ConnectedRepositoryTriggerMetadata | null> {
    const repository = await this.prisma.repository.findUnique({
      where: { id: repositoryId },
      select: {
        id: true,
        userId: true,
        githubId: true,
        fullName: true,
        defaultBranch: true
      }
    });

    if (!repository) return null;

    return {
      id: repository.id,
      userId: repository.userId,
      providerRepositoryId: repository.githubId,
      fullName: repository.fullName,
      defaultBranch: repository.defaultBranch
    };
  }
}
