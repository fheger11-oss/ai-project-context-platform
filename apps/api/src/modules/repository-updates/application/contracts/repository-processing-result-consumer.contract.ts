import type { RepositoryProcessingResult } from "./repository-processing-result.contract.js";

export const REPOSITORY_PROCESSING_RESULT_CONSUMER = Symbol(
  "REPOSITORY_PROCESSING_RESULT_CONSUMER"
);

export interface RepositoryProcessingResultConsumer {
  consume(result: RepositoryProcessingResult): Promise<void>;
}
