import { Injectable } from "@nestjs/common";

import type { RepositoryProcessingResultConsumer } from "./contracts/repository-processing-result-consumer.contract.js";
import type { RepositoryProcessingResult } from "./contracts/repository-processing-result.contract.js";

@Injectable()
export class NoopRepositoryProcessingResultConsumer implements RepositoryProcessingResultConsumer {
  async consume(_result: RepositoryProcessingResult): Promise<void> {}
}
