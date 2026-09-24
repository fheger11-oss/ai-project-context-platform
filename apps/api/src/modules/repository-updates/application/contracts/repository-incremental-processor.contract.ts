import type { AnalysisResult } from "../../../analysis/domain/contracts/analysis-result.contract.js";
import type { ChangeSet } from "../../../change-sets/domain/change-set.js";
import type { PersistedProjectContext } from "../../../context/domain/contracts/project-context-repository.contract.js";
import type { ScanSnapshot } from "../../../scan/domain/contracts/scan-repository.contract.js";

export const REPOSITORY_INCREMENTAL_PROCESSOR = Symbol("REPOSITORY_INCREMENTAL_PROCESSOR");

export type IncrementalProcessingInput = {
  repositoryId: string;
  userId: string;
  baseCommitSha: string;
  targetCommitSha: string;
  changeSet: ChangeSet;
};

export type IncrementalProcessingResult = {
  scan: ScanSnapshot;
  analysis: AnalysisResult;
  projectContext: PersistedProjectContext;
};

export interface RepositoryIncrementalProcessor {
  process(input: IncrementalProcessingInput): Promise<IncrementalProcessingResult>;
}
