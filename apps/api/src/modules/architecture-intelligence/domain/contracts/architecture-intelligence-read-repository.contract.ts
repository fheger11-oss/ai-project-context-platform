import type { ArchitectureProcessingRequestRecord } from "./architecture-processing-request-repository.contract.js";

export const ARCHITECTURE_INTELLIGENCE_READ_REPOSITORY = Symbol(
  "ARCHITECTURE_INTELLIGENCE_READ_REPOSITORY"
);

export type ArchitectureIntelligenceResultSource = {
  historyId: string | null;
  promotedAt: Date | null;
  projectContextId: string;
  commitSha: string;
  contextVersion: string;
  analyzerVersion: string;
  request: ArchitectureProcessingRequestRecord | null;
};

export interface ArchitectureIntelligenceReadRepository {
  findCurrent(repositoryId: string): Promise<ArchitectureIntelligenceResultSource | null>;
  listHistory(input: {
    repositoryId: string;
    skip: number;
    take: number;
  }): Promise<{ items: ArchitectureIntelligenceResultSource[]; total: number }>;
}
