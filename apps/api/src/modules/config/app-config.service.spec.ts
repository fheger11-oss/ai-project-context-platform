import { describe, expect, it } from "vitest";

import { AppConfigService } from "./app-config.service.js";
import type { Environment } from "./environment.validation.js";

function createConfigService(values: Pick<Environment, "APP_ENV" | "NODE_ENV">) {
  return new AppConfigService({
    get: (key: "APP_ENV" | "NODE_ENV") => values[key]
  } as never);
}

describe("AppConfigService", () => {
  it("enables Swagger outside production", () => {
    expect(
      createConfigService({ APP_ENV: "development", NODE_ENV: "development" }).swaggerEnabled
    ).toBe(true);
  });

  it("disables Swagger when NODE_ENV is production", () => {
    expect(
      createConfigService({ APP_ENV: "production", NODE_ENV: "production" }).swaggerEnabled
    ).toBe(false);
  });
});
