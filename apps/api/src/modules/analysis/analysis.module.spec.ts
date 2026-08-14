import "reflect-metadata";

import { describe, expect, it } from "vitest";

import { AppModule } from "../app/app.module.js";
import { AnalysisModule } from "./analysis.module.js";

const MODULE_IMPORTS_METADATA = "imports";
const MODULE_CONTROLLERS_METADATA = "controllers";
const MODULE_PROVIDERS_METADATA = "providers";

describe("AnalysisModule", () => {
  it("registers an Analysis module shell without presentation or infrastructure providers", () => {
    expect(Reflect.getMetadata(MODULE_CONTROLLERS_METADATA, AnalysisModule) ?? []).toEqual([]);
    expect(Reflect.getMetadata(MODULE_PROVIDERS_METADATA, AnalysisModule) ?? []).toEqual([]);
    expect(Reflect.getMetadata(MODULE_IMPORTS_METADATA, AnalysisModule) ?? []).toEqual([]);
  });

  it("is registered with the application module", () => {
    const imports = Reflect.getMetadata(MODULE_IMPORTS_METADATA, AppModule) as unknown[];

    expect(imports).toContain(AnalysisModule);
  });
});
