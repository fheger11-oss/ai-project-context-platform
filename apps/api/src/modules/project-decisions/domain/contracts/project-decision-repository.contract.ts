import type { ProjectDecisionStatus } from "@ai-context/contracts";

export const PROJECT_DECISION_REPOSITORY = Symbol("PROJECT_DECISION_REPOSITORY");

export type ProjectDecisionRecord = {
  id: string;
  repositoryId: string;
  title: string;
  decision: string;
  rationale: string;
  affectedArea: string;
  status: ProjectDecisionStatus;
  decidedAt: Date;
  sourceProjectContextId: string | null;
  sourceRepositoryUpdateId: string | null;
  sourceCommitSha: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateProjectDecisionInput = Omit<
  ProjectDecisionRecord,
  "id" | "status" | "createdAt" | "updatedAt"
>;

export type UpdateProjectDecisionInput = Partial<
  Pick<
    ProjectDecisionRecord,
    "title" | "decision" | "rationale" | "affectedArea" | "decidedAt" | "status"
  >
>;

export interface ProjectDecisionRepository {
  create(input: CreateProjectDecisionInput): Promise<ProjectDecisionRecord>;
  findByRepositoryAndId(repositoryId: string, id: string): Promise<ProjectDecisionRecord | null>;
  listByRepository(input: {
    repositoryId: string;
    status?: ProjectDecisionStatus;
    page: number;
    pageSize: number;
  }): Promise<{ items: ProjectDecisionRecord[]; total: number }>;
  updateByRepositoryAndId(
    repositoryId: string,
    id: string,
    input: UpdateProjectDecisionInput
  ): Promise<ProjectDecisionRecord | null>;
  findProjectContextSource(
    repositoryId: string,
    id: string
  ): Promise<{ id: string; commitSha: string } | null>;
  findRepositoryUpdateSource(
    repositoryId: string,
    id: string
  ): Promise<{ id: string; targetCommitSha: string } | null>;
  repositoryHasCommit(repositoryId: string, commitSha: string): Promise<boolean>;
}
