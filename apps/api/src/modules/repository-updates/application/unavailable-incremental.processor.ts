import { Injectable } from "@nestjs/common";

import type {
  IncrementalProcessingInput,
  IncrementalProcessingResult,
  RepositoryIncrementalProcessor
} from "./contracts/repository-incremental-processor.contract.js";
import { IncrementalProcessingUnavailableError } from "./errors/incremental-processing-unavailable.error.js";

@Injectable()
export class UnavailableIncrementalProcessor implements RepositoryIncrementalProcessor {
  async process(_input: IncrementalProcessingInput): Promise<IncrementalProcessingResult> {
    throw new IncrementalProcessingUnavailableError();
  }
}
