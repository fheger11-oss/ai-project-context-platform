import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { Environment } from "./environment.validation.js";

@Injectable()
export class AppConfigService {
  constructor(@Inject(ConfigService) private readonly config: ConfigService<Environment, true>) {}

  get nodeEnv() {
    return this.config.get("NODE_ENV", { infer: true });
  }

  get appEnv() {
    return this.config.get("APP_ENV", { infer: true });
  }

  get host() {
    return this.config.get("API_HOST", { infer: true });
  }

  get port() {
    return this.config.get("API_PORT", { infer: true });
  }

  get apiPrefix() {
    return this.config.get("API_PREFIX", { infer: true });
  }

  get apiVersion() {
    return this.config.get("API_VERSION", { infer: true });
  }

  get swaggerPath() {
    return this.config.get("SWAGGER_PATH", { infer: true });
  }

  get databaseUrl() {
    return this.config.get("DATABASE_URL", { infer: true });
  }

  get jwtAccessSecret() {
    return this.config.get("JWT_ACCESS_SECRET", { infer: true });
  }

  get jwtRefreshSecret() {
    return this.config.get("JWT_REFRESH_SECRET", { infer: true });
  }

  get jwtAccessTokenTtlSeconds() {
    return this.config.get("JWT_ACCESS_TOKEN_TTL_SECONDS", { infer: true });
  }

  get jwtRefreshTokenTtlSeconds() {
    return this.config.get("JWT_REFRESH_TOKEN_TTL_SECONDS", { infer: true });
  }

  get githubClientId() {
    return this.config.get("GITHUB_CLIENT_ID", { infer: true });
  }

  get githubClientSecret() {
    return this.config.get("GITHUB_CLIENT_SECRET", { infer: true });
  }

  get githubCallbackUrl() {
    return this.config.get("GITHUB_CALLBACK_URL", { infer: true });
  }

  get webAuthCallbackUrl() {
    return this.config.get("WEB_AUTH_CALLBACK_URL", { infer: true });
  }

  get providerTokenEncryptionKey() {
    return this.config.get("PROVIDER_TOKEN_ENCRYPTION_KEY", { infer: true });
  }

  get corsOrigins() {
    const origins = this.config.get("CORS_ORIGINS", { infer: true });

    if (origins === "*") {
      return true;
    }

    return origins.split(",").map((origin) => origin.trim());
  }
}
