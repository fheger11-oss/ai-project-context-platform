import "reflect-metadata";

import { describe, expect, it } from "vitest";

import { AppModule } from "../app/app.module.js";
import { AnalysisModule } from "../analysis/analysis.module.js";
import { DeterministicContextGenerator } from "./application/deterministic-context.generator.js";
import { GenerateAndPersistProjectContextService } from "./application/generate-and-persist-project-context.service.js";
import { GenerateProjectContextService } from "./application/generate-project-context.service.js";
import { GetAnalysisProjectContextsService } from "./application/get-analysis-project-contexts.service.js";
import { GetProjectContextService } from "./application/get-project-context.service.js";
import { PersistProjectContextService } from "./application/persist-project-context.service.js";
import { ReadContextInputService } from "./application/read-context-input.service.js";
import { ContextModule } from "./context.module.js";
import { ANALYSIS_CONTEXT_READER } from "./domain/contracts/analysis-context-reader.contract.js";
import { CONTEXT_GENERATOR } from "./domain/contracts/context-generator.contract.js";
import { PROJECT_CONTEXT_READER } from "./domain/contracts/project-context-reader.contract.js";
import { PROJECT_CONTEXT_REPOSITORY } from "./domain/contracts/project-context-repository.contract.js";
import { AnalysisResultContextReader } from "./infrastructure/analysis-result-context.reader.js";
import { PrismaProjectContextRepository } from "./infrastructure/prisma-project-context.repository.js";
import { AnalysisContextController } from "./presentation/analysis-context.controller.js";
import { ProjectContextController } from "./presentation/project-context.controller.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { ScanModule } from "../scan/scan.module.js";

const MODULE_IMPORTS_METADATA = "imports";
const MODULE_CONTROLLERS_METADATA = "controllers";
const MODULE_PROVIDERS_METADATA = "providers";
const MODULE_EXPORTS_METADATA = "exports";

describe("ContextModule", () => {
  it("registers Context generation and persistence without API providers", () => {
    expect(Reflect.getMetadata(MODULE_IMPORTS_METADATA, ContextModule) ?? []).toEqual([
      AnalysisModule,
      PrismaModule,
      ScanModule
    ]);
    expect(Reflect.getMetadata(MODULE_CONTROLLERS_METADATA, ContextModule) ?? []).toEqual([
      AnalysisContextController,
      ProjectContextController
    ]);
    expect(Reflect.getMetadata(MODULE_PROVIDERS_METADATA, ContextModule) ?? []).toEqual([
      GenerateAndPersistProjectContextService,
      GenerateProjectContextService,
      GetAnalysisProjectContextsService,
      GetProjectContextService,
      PersistProjectContextService,
      ReadContextInputService,
      {
        provide: ANALYSIS_CONTEXT_READER,
        useClass: AnalysisResultContextReader
      },
      {
        provide: CONTEXT_GENERATOR,
        useClass: DeterministicContextGenerator
      },
      {
        provide: PROJECT_CONTEXT_REPOSITORY,
        useClass: PrismaProjectContextRepository
      },
      {
        provide: PROJECT_CONTEXT_READER,
        useExisting: GetProjectContextService
      }
    ]);
    expect(Reflect.getMetadata(MODULE_EXPORTS_METADATA, ContextModule) ?? []).toEqual([
      GenerateAndPersistProjectContextService,
      GenerateProjectContextService,
      GetAnalysisProjectContextsService,
      GetProjectContextService,
      PersistProjectContextService,
      ReadContextInputService,
      ANALYSIS_CONTEXT_READER,
      CONTEXT_GENERATOR,
      PROJECT_CONTEXT_READER,
      PROJECT_CONTEXT_REPOSITORY
    ]);
  });

  it("is registered with the application module", () => {
    const imports = Reflect.getMetadata(MODULE_IMPORTS_METADATA, AppModule) as unknown[];

    expect(imports).toContain(ContextModule);
  });
});
