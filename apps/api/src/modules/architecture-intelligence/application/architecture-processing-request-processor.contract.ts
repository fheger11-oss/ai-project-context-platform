import type { ArchitectureProcessingRequestRecord } from "../domain/contracts/architecture-processing-request-repository.contract.js";

export const ARCHITECTURE_PROCESSING_REQUEST_PROCESSOR = Symbol(
  "ARCHITECTURE_PROCESSING_REQUEST_PROCESSOR"
);

export type ArchitectureProcessingOutcome = "COMPLETED" | "INCOMPATIBLE";

export interface ArchitectureProcessingRequestProcessor {
  process(request: ArchitectureProcessingRequestRecord): Promise<ArchitectureProcessingOutcome>;
}
