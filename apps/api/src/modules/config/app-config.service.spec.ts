import { describe, expect, it } from "vitest";

import { AppConfigService } from "./app-config.service.js";
import type { Environment } from "./environment.validation.js";

function createConfigService(
  values: Partial<Environment> & Pick<Environment, "APP_ENV" | "NODE_ENV">
) {
  return new AppConfigService({
    get: (key: keyof Environment) => values[key]
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

  it("exposes rate limits in milliseconds for the throttler module", () => {
    const config = createConfigService({
      APP_ENV: "production",
      NODE_ENV: "production",
      API_TRUST_PROXY: true,
      RATE_LIMIT_AUTH_MAX: 10,
      RATE_LIMIT_AUTH_TTL_SECONDS: 60,
      RATE_LIMIT_GLOBAL_MAX: 300,
      RATE_LIMIT_GLOBAL_TTL_SECONDS: 60
    });

    expect(config.trustProxy).toBe(true);
    expect(config.rateLimitAuthMax).toBe(10);
    expect(config.rateLimitAuthTtlMilliseconds).toBe(60_000);
    expect(config.rateLimitGlobalMax).toBe(300);
    expect(config.rateLimitGlobalTtlMilliseconds).toBe(60_000);
  });
});
