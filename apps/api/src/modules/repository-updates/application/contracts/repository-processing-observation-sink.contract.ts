import type { RepositoryProcessingObservation } from "./repository-processing-observation.contract.js";

export const REPOSITORY_PROCESSING_OBSERVATION_SINK = Symbol(
  "REPOSITORY_PROCESSING_OBSERVATION_SINK"
);

export interface RepositoryProcessingObservationSink {
  record(observation: RepositoryProcessingObservation): Promise<void>;
}
