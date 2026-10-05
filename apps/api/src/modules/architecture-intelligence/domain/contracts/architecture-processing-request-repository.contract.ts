export const ARCHITECTURE_PROCESSING_REQUEST_REPOSITORY = Symbol(
  "ARCHITECTURE_PROCESSING_REQUEST_REPOSITORY"
);

export type ArchitectureProcessingStatus =
  "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "INCOMPATIBLE";

export type ArchitectureProcessingRequestRecord = {
  id: string;
  repositoryId: string;
  projectContextId: string;
  processorVersion: string;
  status: ArchitectureProcessingStatus;
  attemptCount: number;
  nextAttemptAt: Date;
  claimedBy: string | null;
  leaseUntil: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  lastFailureCategory: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateArchitectureProcessingRequestInput = {
  repositoryId: string;
  projectContextId: string;
  processorVersion: string;
  nextAttemptAt?: Date;
};

export type UpdateArchitectureProcessingRequestStatusInput = {
  repositoryId: string;
  id: string;
  status: ArchitectureProcessingStatus;
  startedAt?: Date | null;
  completedAt?: Date | null;
  lastFailureCategory?: string | null;
};

export interface ArchitectureProcessingRequestRepository {
  create(
    input: CreateArchitectureProcessingRequestInput
  ): Promise<ArchitectureProcessingRequestRecord>;
  findByRepositoryAndId(
    repositoryId: string,
    id: string
  ): Promise<ArchitectureProcessingRequestRecord | null>;
  findByRepositoryContextAndProcessorVersion(
    repositoryId: string,
    projectContextId: string,
    processorVersion: string
  ): Promise<ArchitectureProcessingRequestRecord | null>;
  updateStatus(
    input: UpdateArchitectureProcessingRequestStatusInput
  ): Promise<ArchitectureProcessingRequestRecord | null>;
}
