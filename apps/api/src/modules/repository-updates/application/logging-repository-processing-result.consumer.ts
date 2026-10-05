import { Inject, Injectable } from "@nestjs/common";

import type { RepositoryProcessingResultConsumer } from "./contracts/repository-processing-result-consumer.contract.js";
import type { RepositoryProcessingResult } from "./contracts/repository-processing-result.contract.js";
import {
  REPOSITORY_PROCESSING_OBSERVATION_SINK,
  type RepositoryProcessingObservationSink
} from "./contracts/repository-processing-observation-sink.contract.js";
import { RepositoryProcessingObservationMapper } from "./repository-processing-observation.mapper.js";

@Injectable()
export class LoggingRepositoryProcessingResultConsumer implements RepositoryProcessingResultConsumer {
  constructor(
    @Inject(RepositoryProcessingObservationMapper)
    private readonly mapper: RepositoryProcessingObservationMapper,
    @Inject(REPOSITORY_PROCESSING_OBSERVATION_SINK)
    private readonly sink: RepositoryProcessingObservationSink
  ) {}

  async consume(result: RepositoryProcessingResult): Promise<void> {
    await this.sink.record(this.mapper.map(result));
  }
}
