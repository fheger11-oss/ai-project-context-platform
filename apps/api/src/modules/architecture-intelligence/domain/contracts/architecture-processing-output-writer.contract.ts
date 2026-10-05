import type { CreateArchitectureFindingOccurrenceInput } from "./architecture-finding-occurrence-repository.contract.js";
import type { CreateArchitectureModuleMeasurementInput } from "./architecture-module-measurement-repository.contract.js";

export const ARCHITECTURE_PROCESSING_OUTPUT_WRITER = Symbol(
  "ARCHITECTURE_PROCESSING_OUTPUT_WRITER"
);

export type ArchitectureProcessingOutput = {
  findings: readonly CreateArchitectureFindingOccurrenceInput[];
  measurements: readonly CreateArchitectureModuleMeasurementInput[];
};

export interface ArchitectureProcessingOutputWriter {
  persist(output: ArchitectureProcessingOutput): Promise<void>;
}
