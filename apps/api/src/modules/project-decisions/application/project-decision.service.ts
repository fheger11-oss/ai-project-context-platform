import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type {
  CreateProjectDecisionRequest,
  ProjectDecisionStatus,
  UpdateProjectDecisionRequest
} from "@ai-context/contracts";

import { RepositoriesService } from "../../repositories/repositories.service.js";
import {
  PROJECT_DECISION_REPOSITORY,
  type ProjectDecisionRecord,
  type ProjectDecisionRepository
} from "../domain/contracts/project-decision-repository.contract.js";
import {
  canTransitionProjectDecisionStatus,
  FULL_GIT_SHA_PATTERN,
  normalizeCommitSha,
  normalizeRequiredText
} from "../domain/project-decision.js";

export type ProjectDecisionListResult = {
  items: ProjectDecisionRecord[];
  pagination: { page: number; pageSize: number; total: number; hasNextPage: boolean };
};

@Injectable()
export class ProjectDecisionService {
  constructor(
    @Inject(PROJECT_DECISION_REPOSITORY)
    private readonly decisions: ProjectDecisionRepository,
    @Inject(RepositoriesService)
    private readonly repositories: RepositoriesService
  ) {}

  async create(
    userId: string,
    repositoryId: string,
    request: CreateProjectDecisionRequest
  ): Promise<ProjectDecisionRecord> {
    await this.assertOwnership(userId, repositoryId);
    const sourceCommitSha = normalizeCommitSha(request.sourceCommitSha);
    await this.validateProvenance(repositoryId, {
      ...(request.sourceProjectContextId
        ? { sourceProjectContextId: request.sourceProjectContextId }
        : {}),
      ...(request.sourceRepositoryUpdateId
        ? { sourceRepositoryUpdateId: request.sourceRepositoryUpdateId }
        : {}),
      sourceCommitSha
    });

    return this.decisions.create({
      repositoryId,
      title: normalizeRequiredText(request.title),
      decision: normalizeRequiredText(request.decision),
      rationale: normalizeRequiredText(request.rationale),
      affectedArea: normalizeRequiredText(request.affectedArea),
      decidedAt: new Date(request.decidedAt),
      sourceProjectContextId: request.sourceProjectContextId ?? null,
      sourceRepositoryUpdateId: request.sourceRepositoryUpdateId ?? null,
      sourceCommitSha
    });
  }

  async list(input: {
    userId: string;
    repositoryId: string;
    status?: ProjectDecisionStatus;
    page: number;
    pageSize: number;
  }): Promise<ProjectDecisionListResult> {
    await this.assertOwnership(input.userId, input.repositoryId);
    const result = await this.decisions.listByRepository(input);

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

  async get(userId: string, repositoryId: string, id: string): Promise<ProjectDecisionRecord> {
    await this.assertOwnership(userId, repositoryId);
    return this.findOrThrow(repositoryId, id);
  }

  async update(
    userId: string,
    repositoryId: string,
    id: string,
    request: UpdateProjectDecisionRequest
  ): Promise<ProjectDecisionRecord> {
    await this.assertOwnership(userId, repositoryId);
    if (Object.keys(request).length === 0) {
      throw new BadRequestException("At least one ProjectDecision field must be updated.");
    }
    const current = await this.findOrThrow(repositoryId, id);

    if (request.status && !canTransitionProjectDecisionStatus(current.status, request.status)) {
      throw new BadRequestException(
        `ProjectDecision status cannot transition from ${current.status} to ${request.status}.`
      );
    }

    const updated = await this.decisions.updateByRepositoryAndId(repositoryId, id, current.status, {
      ...(request.title === undefined ? {} : { title: normalizeRequiredText(request.title) }),
      ...(request.decision === undefined
        ? {}
        : { decision: normalizeRequiredText(request.decision) }),
      ...(request.rationale === undefined
        ? {}
        : { rationale: normalizeRequiredText(request.rationale) }),
      ...(request.affectedArea === undefined
        ? {}
        : { affectedArea: normalizeRequiredText(request.affectedArea) }),
      ...(request.decidedAt === undefined ? {} : { decidedAt: new Date(request.decidedAt) }),
      ...(request.status === undefined ? {} : { status: request.status })
    });

    if (!updated) {
      throw new ConflictException(
        "ProjectDecision changed while the update was being applied. Reload and try again."
      );
    }
    return updated;
  }

  private async assertOwnership(userId: string, repositoryId: string): Promise<void> {
    await this.repositories.getScanAccessMetadataForUser(userId, repositoryId);
  }

  private async findOrThrow(repositoryId: string, id: string): Promise<ProjectDecisionRecord> {
    const decision = await this.decisions.findByRepositoryAndId(repositoryId, id);
    if (!decision) throw new NotFoundException("ProjectDecision was not found");
    return decision;
  }

  private async validateProvenance(
    repositoryId: string,
    input: {
      sourceProjectContextId?: string;
      sourceRepositoryUpdateId?: string;
      sourceCommitSha: string | null;
    }
  ): Promise<void> {
    if (input.sourceCommitSha && !FULL_GIT_SHA_PATTERN.test(input.sourceCommitSha)) {
      throw new BadRequestException("sourceCommitSha must be a full Git SHA.");
    }

    const [context, update] = await Promise.all([
      input.sourceProjectContextId
        ? this.decisions.findProjectContextSource(repositoryId, input.sourceProjectContextId)
        : null,
      input.sourceRepositoryUpdateId
        ? this.decisions.findRepositoryUpdateSource(repositoryId, input.sourceRepositoryUpdateId)
        : null
    ]);

    if (input.sourceProjectContextId && !context) {
      throw new BadRequestException("sourceProjectContextId is not valid for this repository.");
    }
    if (input.sourceRepositoryUpdateId && !update) {
      throw new BadRequestException("sourceRepositoryUpdateId is not valid for this repository.");
    }

    const commits = [context?.commitSha, update?.targetCommitSha, input.sourceCommitSha].filter(
      (value): value is string => Boolean(value)
    );
    if (new Set(commits.map((value) => value.toLowerCase())).size > 1) {
      throw new BadRequestException("ProjectDecision provenance commits do not match.");
    }

    if (
      input.sourceCommitSha &&
      !(await this.decisions.repositoryHasCommit(repositoryId, input.sourceCommitSha))
    ) {
      throw new BadRequestException("sourceCommitSha is not known for this repository.");
    }
  }
}
