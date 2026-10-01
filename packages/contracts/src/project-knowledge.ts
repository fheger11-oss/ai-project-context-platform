export type ProjectKnowledgeStatus = "ACTIVE" | "SUPERSEDED" | "ARCHIVED";
export type ProjectKnowledgeOrigin = "USER_AUTHORED" | "SYSTEM_DERIVED";
export type ProjectKnowledgeKind = "USER_ASSERTED" | "OBSERVED" | "INFERRED";
export type ProjectKnowledgeSourceType =
  "USER" | "REPOSITORY" | "PROJECT_CONTEXT" | "PROJECT_DECISION";
export type ProjectKnowledgeConfidence = "LOW" | "MEDIUM" | "HIGH";

export type ProjectKnowledge = {
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
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectKnowledgeListResponse = {
  items: ProjectKnowledge[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasNextPage: boolean;
  };
};

export type CreateProjectKnowledgeRequest = {
  content: string;
};

export type UpdateProjectKnowledgeRequest = Partial<Pick<ProjectKnowledge, "content" | "status">>;
