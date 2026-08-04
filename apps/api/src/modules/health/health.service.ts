import { Inject, Injectable } from "@nestjs/common";

import { AppConfigService } from "../config/app-config.service.js";
import type { HealthResponseDto } from "./dto/health-response.dto.js";

@Injectable()
export class HealthService {
  constructor(@Inject(AppConfigService) private readonly config: AppConfigService) {}

  getHealth(): HealthResponseDto {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: this.config.appEnv
    };
  }
}
