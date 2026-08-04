import { Module } from "@nestjs/common";

import { AppConfigModule } from "../config/app-config.module.js";
import { HealthController } from "./health.controller.js";
import { HealthService } from "./health.service.js";

@Module({
  imports: [AppConfigModule],
  controllers: [HealthController],
  providers: [HealthService]
})
export class HealthModule {}
