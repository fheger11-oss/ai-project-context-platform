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

  get corsOrigins() {
    const origins = this.config.get("CORS_ORIGINS", { infer: true });

    if (origins === "*") {
      return true;
    }

    return origins.split(",").map((origin) => origin.trim());
  }
}
