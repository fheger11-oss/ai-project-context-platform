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

  it("treats either production marker as production", () => {
    const config = createConfigService({ APP_ENV: "production", NODE_ENV: "development" });

    expect(config.isProduction).toBe(true);
    expect(config.swaggerEnabled).toBe(false);
  });

  it("disables debug and verbose log levels in production", () => {
    const config = createConfigService({ APP_ENV: "production", NODE_ENV: "production" });

    expect(config.logLevels).toEqual(["error", "warn", "log"]);
  });

  it("keeps debug and verbose log levels available outside production", () => {
    const config = createConfigService({ APP_ENV: "development", NODE_ENV: "development" });

    expect(config.logLevels).toEqual(["error", "warn", "log", "debug", "verbose"]);
  });

  it("exposes only the explicitly configured CORS origins", () => {
    const config = createConfigService({
      APP_ENV: "production",
      NODE_ENV: "production",
      CORS_ORIGINS: "https://ctxaro.com,https://www.ctxaro.com"
    });

    expect(config.corsOrigins).toEqual(["https://ctxaro.com", "https://www.ctxaro.com"]);
    expect(config.corsOrigins).not.toContain("https://untrusted.example.com");
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

  it("exposes the repository update recovery threshold in milliseconds", () => {
    const config = createConfigService({
      APP_ENV: "production",
      NODE_ENV: "production",
      REPOSITORY_UPDATE_STALE_THRESHOLD_SECONDS: 21_600
    });

    expect(config.repositoryUpdateStaleThresholdMilliseconds).toBe(21_600_000);
  });

  it("exposes the canonical GitHub webhook callback URL", () => {
    const config = createConfigService({
      APP_ENV: "production",
      NODE_ENV: "production",
      GITHUB_WEBHOOK_CALLBACK_URL: "https://api.ctxaro.com/api/v1/webhooks/github"
    });

    expect(config.githubWebhookCallbackUrl).toBe("https://api.ctxaro.com/api/v1/webhooks/github");
  });

  it("exposes the validated monthly analysis limit", () => {
    const config = createConfigService({
      APP_ENV: "staging",
      NODE_ENV: "development",
      ANALYSIS_MONTHLY_LIMIT: 100
    });

    expect(config.analysisMonthlyLimit).toBe(100);
  });

  it("exposes the validated monthly scan limit", () => {
    const config = createConfigService({
      APP_ENV: "staging",
      NODE_ENV: "development",
      SCAN_MONTHLY_LIMIT: 100
    });

    expect(config.scanMonthlyLimit).toBe(100);
  });

  it("exposes all downstream monthly quota limits", () => {
    const config = createConfigService({
      APP_ENV: "staging",
      NODE_ENV: "development",
      CONTEXT_MONTHLY_LIMIT: 100,
      DOCUMENT_MONTHLY_LIMIT: 100,
      AI_EXPORT_MONTHLY_LIMIT: 100
    });

    expect(config.contextMonthlyLimit).toBe(100);
    expect(config.documentMonthlyLimit).toBe(100);
    expect(config.aiExportMonthlyLimit).toBe(100);
  });
});
