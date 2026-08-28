import "reflect-metadata";

import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { describe, expect, it } from "vitest";

import { AppModule } from "./app.module.js";

const MODULE_IMPORTS_METADATA = "imports";
const MODULE_PROVIDERS_METADATA = "providers";

describe("AppModule security", () => {
  it("registers the Nest throttler and binds its guard globally", () => {
    const imports = Reflect.getMetadata(MODULE_IMPORTS_METADATA, AppModule) as Array<{
      module?: unknown;
    }>;
    const providers = Reflect.getMetadata(MODULE_PROVIDERS_METADATA, AppModule) as Array<{
      provide?: unknown;
      useClass?: unknown;
    }>;

    expect(imports.some((moduleImport) => moduleImport.module === ThrottlerModule)).toBe(true);
    expect(providers).toContainEqual({
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    });
  });
});
