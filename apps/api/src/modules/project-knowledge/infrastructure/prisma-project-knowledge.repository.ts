import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "../../../generated/prisma/client.js";
import type { ProjectKnowledgeModel } from "../../../generated/prisma/models.js";

import { PrismaService } from "../../prisma/prisma.service.js";
import type {
  CreateProjectKnowledgeInput,
  ProjectKnowledgeRecord,
  ProjectKnowledgeRepository,
  UpdateProjectKnowledgeInput
} from "../domain/contracts/project-knowledge-repository.contract.js";

@Injectable()
export class PrismaProjectKnowledgeRepository implements ProjectKnowledgeRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(input: CreateProjectKnowledgeInput): Promise<ProjectKnowledgeRecord> {
    return toRecord(await this.prisma.projectKnowledge.create({ data: input }));
  }

  async findByRepositoryAndId(
    repositoryId: string,
    id: string
  ): Promise<ProjectKnowledgeRecord | null> {
    const stored = await this.prisma.projectKnowledge.findFirst({ where: { id, repositoryId } });
    return stored ? toRecord(stored) : null;
  }

  async listByRepository(input: {
    repositoryId: string;
    status?: ProjectKnowledgeRecord["status"];
    page: number;
    pageSize: number;
  }): Promise<{ items: ProjectKnowledgeRecord[]; total: number }> {
    const where: Prisma.ProjectKnowledgeWhereInput = {
      repositoryId: input.repositoryId,
      ...(input.status ? { status: input.status } : {})
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.projectKnowledge.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize
      }),
      this.prisma.projectKnowledge.count({ where })
    ]);
    return { items: items.map(toRecord), total };
  }

  async updateByRepositoryAndId(
    repositoryId: string,
    id: string,
    expectedStatus: ProjectKnowledgeRecord["status"],
    input: UpdateProjectKnowledgeInput
  ): Promise<ProjectKnowledgeRecord | null> {
    const result = await this.prisma.projectKnowledge.updateMany({
      where: { id, repositoryId, status: expectedStatus },
      data: input
    });
    if (result.count === 0) return null;
    return this.findByRepositoryAndId(repositoryId, id);
  }
}

function toRecord(stored: ProjectKnowledgeModel): ProjectKnowledgeRecord {
  return { ...stored };
}
