import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import {
  ANALYSIS_CONTEXT_READER,
  type AnalysisContextReader,
  type ReadAnalysisForContextInput
} from "../domain/contracts/analysis-context-reader.contract.js";
import type { ContextInput } from "../domain/contracts/context-input.contract.js";

export type ReadContextInputQuery = ReadAnalysisForContextInput;

@Injectable()
export class ReadContextInputService {
  constructor(
    @Inject(ANALYSIS_CONTEXT_READER)
    private readonly analysisContextReader: AnalysisContextReader
  ) {}

  async read(query: ReadContextInputQuery): Promise<ContextInput> {
    const input = await this.analysisContextReader.readAnalysisForContext(query);

    if (!input) {
      throw new NotFoundException("Analysis was not found");
    }

    return input;
  }
}
