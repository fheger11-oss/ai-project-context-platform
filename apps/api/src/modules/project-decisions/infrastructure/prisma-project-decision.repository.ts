import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "../../../generated/prisma/client.js";
import type { ProjectDecisionModel } from "../../../generated/prisma/models.js";

import { PrismaService } from "../../prisma/prisma.service.js";
import type {
  CreateProjectDecisionInput,
  ProjectDecisionRecord,
  ProjectDecisionRepository,
  UpdateProjectDecisionInput
} from "../domain/contracts/project-decision-repository.contract.js";

@Injectable()
export class PrismaProjectDecisionRepository implements ProjectDecisionRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(input: CreateProjectDecisionInput): Promise<ProjectDecisionRecord> {
    return toRecord(await this.prisma.projectDecision.create({ data: input }));
  }

  async findByRepositoryAndId(
    repositoryId: string,
    id: string
  ): Promise<ProjectDecisionRecord | null> {
    const stored = await this.prisma.projectDecision.findFirst({ where: { id, repositoryId } });
    return stored ? toRecord(stored) : null;
  }

  async listByRepository(input: {
    repositoryId: string;
    status?: ProjectDecisionRecord["status"];
    page: number;
    pageSize: number;
  }): Promise<{ items: ProjectDecisionRecord[]; total: number }> {
    const where: Prisma.ProjectDecisionWhereInput = {
      repositoryId: input.repositoryId,
      ...(input.status ? { status: input.status } : {})
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.projectDecision.findMany({
        where,
        orderBy: [{ decidedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize
      }),
      this.prisma.projectDecision.count({ where })
    ]);
    return { items: items.map(toRecord), total };
  }

  async updateByRepositoryAndId(
    repositoryId: string,
    id: string,
    input: UpdateProjectDecisionInput
  ): Promise<ProjectDecisionRecord | null> {
    const result = await this.prisma.projectDecision.updateMany({
      where: { id, repositoryId },
      data: input
    });
    if (result.count === 0) return null;
    return this.findByRepositoryAndId(repositoryId, id);
  }

  findProjectContextSource(repositoryId: string, id: string) {
    return this.prisma.projectContext.findFirst({
      where: { id, repositoryId },
      select: { id: true, commitSha: true }
    });
  }

  findRepositoryUpdateSource(repositoryId: string, id: string) {
    return this.prisma.repositoryUpdate.findFirst({
      where: { id, repositoryId },
      select: { id: true, targetCommitSha: true }
    });
  }

  async repositoryHasCommit(repositoryId: string, commitSha: string): Promise<boolean> {
    const [scan, analysis, context, update, state] = await Promise.all([
      this.prisma.scan.findFirst({ where: { repositoryId, commitSha }, select: { id: true } }),
      this.prisma.analysis.findFirst({ where: { repositoryId, commitSha }, select: { id: true } }),
      this.prisma.projectContext.findFirst({
        where: { repositoryId, commitSha },
        select: { id: true }
      }),
      this.prisma.repositoryUpdate.findFirst({
        where: {
          repositoryId,
          OR: [{ targetCommitSha: commitSha }, { baseCommitSha: commitSha }]
        },
        select: { id: true }
      }),
      this.prisma.repositoryState.findFirst({
        where: {
          repositoryId,
          OR: [
            { remoteHeadCommitSha: commitSha },
            { lastScannedCommitSha: commitSha },
            { lastAnalyzedCommitSha: commitSha },
            { currentContextCommitSha: commitSha }
          ]
        },
        select: { id: true }
      })
    ]);
    return Boolean(scan || analysis || context || update || state);
  }
}

function toRecord(stored: ProjectDecisionModel): ProjectDecisionRecord {
  return { ...stored };
}
