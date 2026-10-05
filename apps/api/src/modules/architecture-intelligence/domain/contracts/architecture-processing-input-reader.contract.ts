import type { ArchitectureProcessingRequestRecord } from "./architecture-processing-request-repository.contract.js";

export const ARCHITECTURE_PROCESSING_INPUT_READER = Symbol("ARCHITECTURE_PROCESSING_INPUT_READER");

export type ArchitectureProcessingInput = {
  repositoryId: string;
  projectContextId: string;
  analysisId: string;
  scanId: string;
  commitSha: string;
  contextVersion: string;
  analyzerVersion: string;
  architectureClaims: readonly unknown[];
  analysisRelationships: readonly unknown[];
};

export interface ArchitectureProcessingInputReader {
  read(request: ArchitectureProcessingRequestRecord): Promise<ArchitectureProcessingInput>;
}
