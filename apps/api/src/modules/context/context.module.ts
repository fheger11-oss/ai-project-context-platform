import { Module } from "@nestjs/common";

import { DeterministicContextGenerator } from "./application/deterministic-context.generator.js";
import { GenerateProjectContextService } from "./application/generate-project-context.service.js";
import { ReadContextInputService } from "./application/read-context-input.service.js";
import { ANALYSIS_CONTEXT_READER } from "./domain/contracts/analysis-context-reader.contract.js";
import { CONTEXT_GENERATOR } from "./domain/contracts/context-generator.contract.js";
import { AnalysisResultContextReader } from "./infrastructure/analysis-result-context.reader.js";
import { AnalysisModule } from "../analysis/analysis.module.js";

@Module({
  imports: [AnalysisModule],
  providers: [
    GenerateProjectContextService,
    ReadContextInputService,
    {
      provide: ANALYSIS_CONTEXT_READER,
      useClass: AnalysisResultContextReader
    },
    {
      provide: CONTEXT_GENERATOR,
      useClass: DeterministicContextGenerator
    }
  ],
  exports: [
    GenerateProjectContextService,
    ReadContextInputService,
    ANALYSIS_CONTEXT_READER,
    CONTEXT_GENERATOR
  ]
})
export class ContextModule {}
