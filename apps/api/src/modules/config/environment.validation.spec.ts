import { describe, expect, it } from "vitest";

import { validateEnvironment } from "./environment.validation.js";

const productionEnvironment = {
  NODE_ENV: "production",
  APP_ENV: "production",
  API_HOST: "0.0.0.0",
  API_PORT: "3000",
  API_TRUST_PROXY: "false",
  API_PREFIX: "api",
  API_VERSION: "1",
  SWAGGER_PATH: "docs",
  CORS_ORIGINS: "https://app.example.com",
  RATE_LIMIT_GLOBAL_TTL_SECONDS: "60",
  RATE_LIMIT_GLOBAL_MAX: "300",
  RATE_LIMIT_AUTH_TTL_SECONDS: "60",
  RATE_LIMIT_AUTH_MAX: "10",
  DATABASE_URL: "postgresql://user:password@db.example.com:5432/app",
  JWT_ACCESS_SECRET: "production-access-secret-at-least-32-characters",
  JWT_REFRESH_SECRET: "production-refresh-secret-at-least-32-characters",
  JWT_ACCESS_TOKEN_TTL_SECONDS: "7200",
  JWT_REFRESH_TOKEN_TTL_SECONDS: "2592000",
  GITHUB_CLIENT_ID: "github-client-id",
  GITHUB_CLIENT_SECRET: "github-client-secret",
  GITHUB_CALLBACK_URL: "https://api.example.com/api/v1/auth/github/callback",
  WEB_AUTH_CALLBACK_URL: "https://app.example.com/auth/callback",
  PROVIDER_TOKEN_ENCRYPTION_KEY: "provider-token-key-at-least-32-characters"
};

describe("validateEnvironment", () => {
  it("accepts explicit production-safe configuration", () => {
    expect(validateEnvironment(productionEnvironment)).toMatchObject({
      APP_ENV: "production",
      API_TRUST_PROXY: false,
      CORS_ORIGINS: "https://app.example.com",
      NODE_ENV: "production",
      RATE_LIMIT_AUTH_MAX: 10,
      RATE_LIMIT_AUTH_TTL_SECONDS: 60,
      RATE_LIMIT_GLOBAL_MAX: 300,
      RATE_LIMIT_GLOBAL_TTL_SECONDS: 60,
      WEB_AUTH_CALLBACK_URL: "https://app.example.com/auth/callback"
    });
  });

  it("parses explicit proxy trust configuration", () => {
    expect(
      validateEnvironment({
        ...productionEnvironment,
        API_TRUST_PROXY: "true"
      })
    ).toMatchObject({
      API_TRUST_PROXY: true
    });
  });

  it("applies rate-limit defaults outside production", () => {
    expect(
      validateEnvironment({
        DATABASE_URL: "postgresql://user:password@localhost:5432/app",
        JWT_ACCESS_SECRET: "development-access-secret-at-least-32-characters",
        JWT_REFRESH_SECRET: "development-refresh-secret-at-least-32-characters",
        GITHUB_CLIENT_ID: "github-client-id",
        GITHUB_CLIENT_SECRET: "github-client-secret",
        GITHUB_CALLBACK_URL: "http://localhost:3000/api/v1/auth/github/callback",
        PROVIDER_TOKEN_ENCRYPTION_KEY: "provider-token-key-at-least-32-characters"
      })
    ).toMatchObject({
      API_TRUST_PROXY: false,
      RATE_LIMIT_AUTH_MAX: 10,
      RATE_LIMIT_AUTH_TTL_SECONDS: 60,
      RATE_LIMIT_GLOBAL_MAX: 300,
      RATE_LIMIT_GLOBAL_TTL_SECONDS: 60
    });
  });

  it("rejects wildcard CORS in production", () => {
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        CORS_ORIGINS: "*"
      })
    ).toThrow(/Wildcard CORS is not allowed in production/);
  });

  it("rejects localhost defaults in production", () => {
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        CORS_ORIGINS: "http://localhost:5173",
        GITHUB_CALLBACK_URL: "http://localhost:3000/api/v1/auth/github/callback",
        WEB_AUTH_CALLBACK_URL: "http://localhost:5173/auth/callback"
      })
    ).toThrow(/localhost in production/);
  });

  it("rejects non-HTTPS public URLs in production", () => {
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        GITHUB_CALLBACK_URL: "postgresql://user:password@db.example.com:5432/app"
      })
    ).toThrow(/GITHUB_CALLBACK_URL must use HTTPS in production/);
  });

  it("rejects mixed production and development environment modes", () => {
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        APP_ENV: "development"
      })
    ).toThrow(/APP_ENV must be production/);
  });
});
