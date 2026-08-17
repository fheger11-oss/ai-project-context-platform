import "reflect-metadata";

import { describe, expect, it } from "vitest";

import { AppModule } from "../app/app.module.js";
import { AnalysisModule } from "../analysis/analysis.module.js";
import { ReadContextInputService } from "./application/read-context-input.service.js";
import { ContextModule } from "./context.module.js";
import { ANALYSIS_CONTEXT_READER } from "./domain/contracts/analysis-context-reader.contract.js";
import { AnalysisResultContextReader } from "./infrastructure/analysis-result-context.reader.js";

const MODULE_IMPORTS_METADATA = "imports";
const MODULE_CONTROLLERS_METADATA = "controllers";
const MODULE_PROVIDERS_METADATA = "providers";
const MODULE_EXPORTS_METADATA = "exports";

describe("ContextModule", () => {
  it("registers the Analysis-to-Context boundary without Context persistence or API providers", () => {
    expect(Reflect.getMetadata(MODULE_IMPORTS_METADATA, ContextModule) ?? []).toEqual([
      AnalysisModule
    ]);
    expect(Reflect.getMetadata(MODULE_CONTROLLERS_METADATA, ContextModule) ?? []).toEqual([]);
    expect(Reflect.getMetadata(MODULE_PROVIDERS_METADATA, ContextModule) ?? []).toEqual([
      ReadContextInputService,
      {
        provide: ANALYSIS_CONTEXT_READER,
        useClass: AnalysisResultContextReader
      }
    ]);
    expect(Reflect.getMetadata(MODULE_EXPORTS_METADATA, ContextModule) ?? []).toEqual([
      ReadContextInputService,
      ANALYSIS_CONTEXT_READER
    ]);
  });

  it("is registered with the application module", () => {
    const imports = Reflect.getMetadata(MODULE_IMPORTS_METADATA, AppModule) as unknown[];

    expect(imports).toContain(ContextModule);
  });
});
