export type ProjectDecisionStatus = "ACTIVE" | "SUPERSEDED" | "ARCHIVED";

export type ProjectDecision = {
  id: string;
  repositoryId: string;
  title: string;
  decision: string;
  rationale: string;
  affectedArea: string;
  status: ProjectDecisionStatus;
  decidedAt: string;
  sourceProjectContextId: string | null;
  sourceRepositoryUpdateId: string | null;
  sourceCommitSha: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectDecisionListResponse = {
  items: ProjectDecision[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasNextPage: boolean;
  };
};

export type CreateProjectDecisionRequest = {
  title: string;
  decision: string;
  rationale: string;
  affectedArea: string;
  decidedAt: string;
  sourceProjectContextId?: string;
  sourceRepositoryUpdateId?: string;
  sourceCommitSha?: string;
};

export type UpdateProjectDecisionRequest = Partial<
  Pick<
    ProjectDecision,
    "title" | "decision" | "rationale" | "affectedArea" | "decidedAt" | "status"
  >
>;
