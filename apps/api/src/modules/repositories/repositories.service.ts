import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import type { RepositoryModel } from "../../generated/prisma/models.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.js";
import type { RepositoryResponseDto } from "./dto/repository-response.dto.js";
import { GitHubRepositoryProvider } from "./providers/github-repository.provider.js";
import type { GitHubRepositoryMetadata } from "./providers/github-repository.provider.js";

@Injectable()
export class RepositoriesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(GitHubRepositoryProvider)
    private readonly githubRepositoryProvider: GitHubRepositoryProvider
  ) {}

  async listAvailableGitHubRepositories(user: AuthenticatedUser, accessToken: string) {
    const [githubRepositories, connectedRepositories] = await Promise.all([
      this.githubRepositoryProvider.listRepositories(accessToken),
      this.prisma.repository.findMany({
        where: { userId: user.id },
        select: { githubId: true }
      })
    ]);
    const connectedIds = new Set(connectedRepositories.map((repository) => repository.githubId));

    return githubRepositories.map((repository) => ({
      ...repository,
      isConnected: connectedIds.has(repository.githubId)
    }));
  }

  async connect(user: AuthenticatedUser, accessToken: string, githubId: string) {
    const repository = await this.githubRepositoryProvider.getRepositoryById(accessToken, githubId);

    if (!repository) {
      throw new NotFoundException("GitHub repository was not found for this account");
    }

    return this.upsertRepository(user.id, repository);
  }

  async list(user: AuthenticatedUser): Promise<RepositoryResponseDto[]> {
    const repositories = await this.prisma.repository.findMany({
      where: { userId: user.id },
      orderBy: [{ lastSyncedAt: "desc" }, { fullName: "asc" }]
    });

    return repositories.map((repository) => this.toResponse(repository));
  }

  async getById(user: AuthenticatedUser, id: string): Promise<RepositoryResponseDto> {
    const repository = await this.prisma.repository.findFirst({
      where: {
        id,
        userId: user.id
      }
    });

    if (!repository) {
      throw new NotFoundException("Repository was not found");
    }

    return this.toResponse(repository);
  }

  async sync(user: AuthenticatedUser, id: string, accessToken: string) {
    const existingRepository = await this.prisma.repository.findFirst({
      where: {
        id,
        userId: user.id
      }
    });

    if (!existingRepository) {
      throw new NotFoundException("Repository was not found");
    }

    const repository = await this.githubRepositoryProvider.getRepositoryById(
      accessToken,
      existingRepository.githubId
    );

    if (!repository) {
      throw new NotFoundException("GitHub repository was not found for this account");
    }

    return this.upsertRepository(user.id, repository);
  }

  private async upsertRepository(userId: string, repository: GitHubRepositoryMetadata) {
    const storedRepository = await this.prisma.repository.upsert({
      where: {
        userId_githubId: {
          userId,
          githubId: repository.githubId
        }
      },
      create: {
        ...repository,
        user: { connect: { id: userId } },
        lastSyncedAt: new Date()
      },
      update: {
        ...repository,
        lastSyncedAt: new Date()
      }
    });

    return this.toResponse(storedRepository);
  }

  private toResponse(repository: RepositoryModel): RepositoryResponseDto {
    return {
      id: repository.id,
      githubId: repository.githubId,
      name: repository.name,
      fullName: repository.fullName,
      owner: repository.owner,
      description: repository.description,
      defaultBranch: repository.defaultBranch,
      visibility: repository.visibility,
      language: repository.language,
      stars: repository.stars,
      forks: repository.forks,
      isArchived: repository.isArchived,
      cloneUrl: repository.cloneUrl,
      htmlUrl: repository.htmlUrl,
      githubUpdatedAt: repository.githubUpdatedAt,
      lastSyncedAt: repository.lastSyncedAt
    };
  }
}
