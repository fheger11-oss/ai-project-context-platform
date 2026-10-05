import type { ArchitectureConfidence } from "../architecture-confidence.js";
import type {
  ArchitectureFindingEvidence,
  ArchitectureFindingSubject
} from "../architecture-finding-evidence.js";

export const ARCHITECTURE_FINDING_OCCURRENCE_REPOSITORY = Symbol(
  "ARCHITECTURE_FINDING_OCCURRENCE_REPOSITORY"
);

export type ArchitectureFindingOccurrenceRecord = {
  id: string;
  repositoryId: string;
  projectContextId: string;
  processingRequestId: string;
  fingerprint: string;
  ruleId: string;
  ruleVersion: string;
  confidence: ArchitectureConfidence;
  subject: ArchitectureFindingSubject;
  evidence: readonly ArchitectureFindingEvidence[];
  createdAt: Date;
};

export type CreateArchitectureFindingOccurrenceInput = Omit<
  ArchitectureFindingOccurrenceRecord,
  "id" | "createdAt"
>;

export interface ArchitectureFindingOccurrenceRepository {
  create(
    input: CreateArchitectureFindingOccurrenceInput
  ): Promise<ArchitectureFindingOccurrenceRecord>;
  listByRepositoryAndProcessingRequest(
    repositoryId: string,
    processingRequestId: string
  ): Promise<ArchitectureFindingOccurrenceRecord[]>;
  listByRepositoryAndProjectContext(
    repositoryId: string,
    projectContextId: string
  ): Promise<ArchitectureFindingOccurrenceRecord[]>;
}
