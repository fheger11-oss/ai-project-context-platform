import type {
  ProjectKnowledgeConfidence,
  ProjectKnowledgeKind,
  ProjectKnowledgeOrigin,
  ProjectKnowledgeSourceType,
  ProjectKnowledgeStatus
} from "@ai-context/contracts";

export const PROJECT_KNOWLEDGE_REPOSITORY = Symbol("PROJECT_KNOWLEDGE_REPOSITORY");

export type ProjectKnowledgeRecord = {
  id: string;
  repositoryId: string;
  content: string;
  status: ProjectKnowledgeStatus;
  origin: ProjectKnowledgeOrigin;
  kind: ProjectKnowledgeKind;
  sourceType: ProjectKnowledgeSourceType;
  confidence: ProjectKnowledgeConfidence | null;
  sourceProjectContextId: string | null;
  sourceProjectDecisionId: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateProjectKnowledgeInput = Omit<
  ProjectKnowledgeRecord,
  "id" | "status" | "createdAt" | "updatedAt"
>;

export type UpdateProjectKnowledgeInput = Partial<
  Pick<ProjectKnowledgeRecord, "content" | "status">
>;

export interface ProjectKnowledgeRepository {
  create(input: CreateProjectKnowledgeInput): Promise<ProjectKnowledgeRecord>;
  findByRepositoryAndId(repositoryId: string, id: string): Promise<ProjectKnowledgeRecord | null>;
  listByRepository(input: {
    repositoryId: string;
    status?: ProjectKnowledgeStatus;
    page: number;
    pageSize: number;
  }): Promise<{ items: ProjectKnowledgeRecord[]; total: number }>;
  updateByRepositoryAndId(
    repositoryId: string,
    id: string,
    expectedStatus: ProjectKnowledgeStatus,
    input: UpdateProjectKnowledgeInput
  ): Promise<ProjectKnowledgeRecord | null>;
}
