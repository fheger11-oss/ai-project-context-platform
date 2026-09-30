import type { ProjectDecisionStatus } from "./project-decisions.js";

type TimelineRepositoryUpdateStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
type TimelineRepositoryUpdateTriggerType = "MANUAL" | "WEBHOOK" | "SYSTEM";

export type ProjectTimelineItemType =
  "REPOSITORY_CONNECTED" | "REPOSITORY_UPDATE" | "CONTEXT_PROMOTED" | "DECISION_EFFECTIVE";

type ProjectTimelineItemBase = {
  type: ProjectTimelineItemType;
  sourceId: string;
  repositoryId: string;
  occurredAt: string;
};

export type RepositoryConnectedTimelineItem = ProjectTimelineItemBase & {
  type: "REPOSITORY_CONNECTED";
  repositoryName: string;
  repositoryFullName: string;
};

export type RepositoryUpdateTimelineItem = ProjectTimelineItemBase & {
  type: "REPOSITORY_UPDATE";
  triggerType: TimelineRepositoryUpdateTriggerType;
  status: TimelineRepositoryUpdateStatus;
  baseCommitSha: string | null;
  targetCommitSha: string;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  scanId: string | null;
  analysisId: string | null;
  projectContextId: string | null;
};

export type ContextPromotedTimelineItem = ProjectTimelineItemBase & {
  type: "CONTEXT_PROMOTED";
  projectContextId: string;
  contextId: string;
  contextVersion: string;
  generatedAt: string;
  commitSha: string;
  scanId: string;
  analysisId: string;
};

export type DecisionEffectiveTimelineItem = ProjectTimelineItemBase & {
  type: "DECISION_EFFECTIVE";
  decisionId: string;
  title: string;
  affectedArea: string;
  status: ProjectDecisionStatus;
  decidedAt: string;
  sourceProjectContextId: string | null;
  sourceRepositoryUpdateId: string | null;
  sourceCommitSha: string | null;
};

export type ProjectTimelineItem =
  | RepositoryConnectedTimelineItem
  | RepositoryUpdateTimelineItem
  | ContextPromotedTimelineItem
  | DecisionEffectiveTimelineItem;

export type ProjectTimelineResponse = {
  items: ProjectTimelineItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};
