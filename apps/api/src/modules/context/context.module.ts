import { Module } from "@nestjs/common";

import { ReadContextInputService } from "./application/read-context-input.service.js";
import { ANALYSIS_CONTEXT_READER } from "./domain/contracts/analysis-context-reader.contract.js";
import { AnalysisResultContextReader } from "./infrastructure/analysis-result-context.reader.js";
import { AnalysisModule } from "../analysis/analysis.module.js";

@Module({
  imports: [AnalysisModule],
  providers: [
    ReadContextInputService,
    {
      provide: ANALYSIS_CONTEXT_READER,
      useClass: AnalysisResultContextReader
    }
  ],
  exports: [ReadContextInputService, ANALYSIS_CONTEXT_READER]
})
export class ContextModule {}
