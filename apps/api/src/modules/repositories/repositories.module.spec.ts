import "reflect-metadata";

import { describe, expect, it } from "vitest";

import { AppConfigModule } from "../config/app-config.module.js";
import { AppConfigService } from "../config/app-config.service.js";
import { RepositoriesModule } from "./repositories.module.js";

const MODULE_IMPORTS_METADATA = "imports";
const MODULE_PROVIDERS_METADATA = "providers";
const MODULE_EXPORTS_METADATA = "exports";

describe("RepositoriesModule configuration dependency", () => {
  it("imports the module that owns and exports the sole AppConfigService provider", () => {
    const repositoryImports = Reflect.getMetadata(
      MODULE_IMPORTS_METADATA,
      RepositoriesModule
    ) as unknown[];
    const repositoryProviders = Reflect.getMetadata(
      MODULE_PROVIDERS_METADATA,
      RepositoriesModule
    ) as unknown[];
    const configProviders = Reflect.getMetadata(
      MODULE_PROVIDERS_METADATA,
      AppConfigModule
    ) as unknown[];
    const configExports = Reflect.getMetadata(
      MODULE_EXPORTS_METADATA,
      AppConfigModule
    ) as unknown[];

    expect(repositoryImports).toContain(AppConfigModule);
    expect(repositoryProviders).not.toContain(AppConfigService);
    expect(configProviders.filter((provider) => provider === AppConfigService)).toHaveLength(1);
    expect(configExports).toContain(AppConfigService);
  });
});
