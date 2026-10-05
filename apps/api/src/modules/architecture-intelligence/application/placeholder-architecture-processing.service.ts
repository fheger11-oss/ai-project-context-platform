import { Injectable } from "@nestjs/common";

import type {
  ArchitectureProcessingOutcome,
  ArchitectureProcessingRequestProcessor
} from "./architecture-processing-request-processor.contract.js";

@Injectable()
export class PlaceholderArchitectureProcessingService implements ArchitectureProcessingRequestProcessor {
  async process(): Promise<ArchitectureProcessingOutcome> {
    return "COMPLETED";
  }
}
