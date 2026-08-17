import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import { GetAnalysisResultService } from "../../analysis/application/get-analysis-result.service.js";
import type {
  AnalysisContextReader,
  ReadAnalysisForContextInput
} from "../domain/contracts/analysis-context-reader.contract.js";
import type { ContextInput } from "../domain/contracts/context-input.contract.js";

@Injectable()
export class AnalysisResultContextReader implements AnalysisContextReader {
  constructor(
    @Inject(GetAnalysisResultService)
    private readonly getAnalysisResultService: GetAnalysisResultService
  ) {}

  async readAnalysisForContext(input: ReadAnalysisForContextInput): Promise<ContextInput | null> {
    try {
      const analysis = await this.getAnalysisResultService.get(input);

      return { analysis };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }

      throw error;
    }
  }
}
