import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type {
  CreateProjectKnowledgeRequest,
  ProjectKnowledgeStatus,
  UpdateProjectKnowledgeRequest
} from "@ai-context/contracts";

import { RepositoriesService } from "../../repositories/repositories.service.js";
import {
  PROJECT_KNOWLEDGE_REPOSITORY,
  type ProjectKnowledgeRecord,
  type ProjectKnowledgeRepository
} from "../domain/contracts/project-knowledge-repository.contract.js";
import {
  canTransitionProjectKnowledgeStatus,
  normalizeProjectKnowledgeContent
} from "../domain/project-knowledge.js";

export type ProjectKnowledgeListResult = {
  items: ProjectKnowledgeRecord[];
  pagination: { page: number; pageSize: number; total: number; hasNextPage: boolean };
};

@Injectable()
export class ProjectKnowledgeService {
  constructor(
    @Inject(PROJECT_KNOWLEDGE_REPOSITORY)
    private readonly knowledge: ProjectKnowledgeRepository,
    @Inject(RepositoriesService)
    private readonly repositories: RepositoriesService
  ) {}

  async create(
    userId: string,
    repositoryId: string,
    request: CreateProjectKnowledgeRequest
  ): Promise<ProjectKnowledgeRecord> {
    await this.assertOwnership(userId, repositoryId);
    return this.knowledge.create({
      repositoryId,
      content: normalizeProjectKnowledgeContent(request.content),
      origin: "USER_AUTHORED",
      kind: "USER_ASSERTED",
      sourceType: "USER",
      confidence: null,
      sourceProjectContextId: null,
      sourceProjectDecisionId: null,
      verifiedAt: null
    });
  }

  async list(input: {
    userId: string;
    repositoryId: string;
    status?: ProjectKnowledgeStatus;
    page: number;
    pageSize: number;
  }): Promise<ProjectKnowledgeListResult> {
    await this.assertOwnership(input.userId, input.repositoryId);
    const result = await this.knowledge.listByRepository(input);
    return {
      items: result.items,
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        total: result.total,
        hasNextPage: input.page * input.pageSize < result.total
      }
    };
  }

  async update(
    userId: string,
    repositoryId: string,
    id: string,
    request: UpdateProjectKnowledgeRequest
  ): Promise<ProjectKnowledgeRecord> {
    await this.assertOwnership(userId, repositoryId);
    if (Object.keys(request).length === 0) {
      throw new BadRequestException("At least one ProjectKnowledge field must be updated.");
    }
    const current = await this.findOrThrow(repositoryId, id);
    if (request.status && !canTransitionProjectKnowledgeStatus(current.status, request.status)) {
      throw new BadRequestException(
        `ProjectKnowledge status cannot transition from ${current.status} to ${request.status}.`
      );
    }
    if (current.status === "SUPERSEDED" && request.content !== undefined) {
      throw new BadRequestException(
        "Superseded ProjectKnowledge content is historical and immutable."
      );
    }

    const updated = await this.knowledge.updateByRepositoryAndId(repositoryId, id, current.status, {
      ...(request.content === undefined
        ? {}
        : { content: normalizeProjectKnowledgeContent(request.content) }),
      ...(request.status === undefined ? {} : { status: request.status })
    });
    if (!updated) {
      throw new ConflictException(
        "ProjectKnowledge changed while the update was being applied. Reload and try again."
      );
    }
    return updated;
  }

  private async assertOwnership(userId: string, repositoryId: string): Promise<void> {
    await this.repositories.getScanAccessMetadataForUser(userId, repositoryId);
  }

  private async findOrThrow(repositoryId: string, id: string): Promise<ProjectKnowledgeRecord> {
    const item = await this.knowledge.findByRepositoryAndId(repositoryId, id);
    if (!item) throw new NotFoundException("ProjectKnowledge was not found");
    return item;
  }
}
