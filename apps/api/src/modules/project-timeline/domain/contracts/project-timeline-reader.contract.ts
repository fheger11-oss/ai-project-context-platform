import type {
  DecisionEffectiveTimelineItem,
  RepositoryUpdateTimelineItem
} from "@ai-context/contracts";

export const PROJECT_TIMELINE_READER = Symbol("PROJECT_TIMELINE_READER");

export type TimelineRepositorySource = {
  id: string;
  name: string;
  fullName: string;
  createdAt: Date;
};

export type TimelineRepositoryUpdateSource = {
  id: string;
  repositoryId: string;
  triggerType: RepositoryUpdateTimelineItem["triggerType"];
  status: RepositoryUpdateTimelineItem["status"];
  baseCommitSha: string | null;
  targetCommitSha: string;
  startedAt: Date | null;
  completedAt: Date | null;
  failedAt: Date | null;
  scanId: string | null;
  analysisId: string | null;
  projectContextId: string | null;
  createdAt: Date;
};

export type TimelineContextPromotionSource = {
  id: string;
  repositoryId: string;
  createdAt: Date;
  projectContext: {
    id: string;
    contextId: string;
    contextVersion: string;
    generatedAt: Date;
    commitSha: string;
    scanId: string;
    analysisId: string;
  };
};

export type TimelineDecisionSource = {
  id: string;
  repositoryId: string;
  title: string;
  affectedArea: string;
  status: DecisionEffectiveTimelineItem["status"];
  decidedAt: Date;
  sourceProjectContextId: string | null;
  sourceRepositoryUpdateId: string | null;
  sourceCommitSha: string | null;
};

export type ProjectTimelineSources = {
  repository: TimelineRepositorySource | null;
  updates: TimelineRepositoryUpdateSource[];
  contextPromotions: TimelineContextPromotionSource[];
  decisions: TimelineDecisionSource[];
  totals: {
    updates: number;
    contextPromotions: number;
    decisions: number;
  };
};

export interface ProjectTimelineReader {
  readCandidates(input: { repositoryId: string; take: number }): Promise<ProjectTimelineSources>;
}
