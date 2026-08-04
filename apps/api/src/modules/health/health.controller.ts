import { Controller, Get, Inject, VERSION_NEUTRAL } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { HealthResponseDto } from "./dto/health-response.dto.js";
import { HealthService } from "./health.service.js";

@ApiTags("health")
@Controller({
  path: "health",
  version: VERSION_NEUTRAL
})
export class HealthController {
  constructor(@Inject(HealthService) private readonly healthService: HealthService) {}

  @Get()
  @ApiOkResponse({ type: HealthResponseDto })
  getHealth(): HealthResponseDto {
    return this.healthService.getHealth();
  }
}
