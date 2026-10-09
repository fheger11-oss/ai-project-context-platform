import type { ArchitectureProcessingRequestRecord } from "./architecture-processing-request-repository.contract.js";
import type { ProjectContextArchitectureModel } from "../../../context/domain/project-context-architecture.js";

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
  architectureModel?: ProjectContextArchitectureModel;
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
