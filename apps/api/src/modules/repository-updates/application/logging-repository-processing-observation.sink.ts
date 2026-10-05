import { Injectable, Logger } from "@nestjs/common";

import type { RepositoryProcessingObservationSink } from "./contracts/repository-processing-observation-sink.contract.js";
import type { RepositoryProcessingObservation } from "./contracts/repository-processing-observation.contract.js";

@Injectable()
export class LoggingRepositoryProcessingObservationSink implements RepositoryProcessingObservationSink {
  private readonly logger = new Logger(LoggingRepositoryProcessingObservationSink.name);

  async record(observation: RepositoryProcessingObservation): Promise<void> {
    this.logger.log(observation);
  }
}
