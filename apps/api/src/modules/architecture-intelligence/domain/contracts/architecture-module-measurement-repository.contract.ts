import type { ArchitectureConfidence } from "../architecture-confidence.js";

export const ARCHITECTURE_MODULE_MEASUREMENT_REPOSITORY = Symbol(
  "ARCHITECTURE_MODULE_MEASUREMENT_REPOSITORY"
);

export type ArchitectureModuleMeasurementRecord = {
  id: string;
  repositoryId: string;
  projectContextId: string;
  processingRequestId: string;
  moduleId: string;
  path: string;
  confidence: ArchitectureConfidence;
  sourceFileCount: number;
  declarationCount: number;
  fanIn: number;
  fanOut: number;
  totalDegree: number;
  relationshipCount: number;
  createdAt: Date;
};

export type CreateArchitectureModuleMeasurementInput = Omit<
  ArchitectureModuleMeasurementRecord,
  "id" | "createdAt"
>;

export interface ArchitectureModuleMeasurementRepository {
  create(
    input: CreateArchitectureModuleMeasurementInput
  ): Promise<ArchitectureModuleMeasurementRecord>;
  listByRepositoryAndProcessingRequest(
    repositoryId: string,
    processingRequestId: string
  ): Promise<ArchitectureModuleMeasurementRecord[]>;
  listByRepositoryAndProjectContext(
    repositoryId: string,
    projectContextId: string
  ): Promise<ArchitectureModuleMeasurementRecord[]>;
}
