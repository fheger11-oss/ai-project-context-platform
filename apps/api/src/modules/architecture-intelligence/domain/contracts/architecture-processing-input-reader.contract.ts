import type { ArchitectureProcessingRequestRecord } from "./architecture-processing-request-repository.contract.js";
import type {
  ArchitectureDependency,
  ArchitecturalModule
} from "../../../context/domain/project-context-architecture.js";

export const ARCHITECTURE_PROCESSING_INPUT_READER = Symbol("ARCHITECTURE_PROCESSING_INPUT_READER");

export type ArchitectureProcessingInput = {
  repositoryId: string;
  projectContextId: string;
  analysisId: string;
  scanId: string;
  commitSha: string;
  contextVersion: string;
  analyzerVersion: string;
  architectureModel: {
    modules: readonly ArchitecturalModule[];
    dependencies: readonly ArchitectureDependency[];
  };
  unresolvedSemanticRelationshipCount: number;
  architectureClaims: readonly unknown[];
  analysisRelationships: readonly unknown[];
};

export interface ArchitectureProcessingInputReader {
  read(request: ArchitectureProcessingRequestRecord): Promise<ArchitectureProcessingInput>;
}
