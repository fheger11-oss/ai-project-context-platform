import { ApiProperty } from "@nestjs/swagger";

import {
  REPOSITORY_AUTOMATION_CAPABILITIES,
  REPOSITORY_AUTOMATION_CONFIGURATION_STATES
} from "../domain/repository-automation-status.js";
import type { RepositoryAutomationStatus } from "../domain/repository-automation-status.js";

class AutomaticUpdatesStatusDto {
  @ApiProperty({ enum: REPOSITORY_AUTOMATION_CAPABILITIES })
  capability!: RepositoryAutomationStatus["automaticUpdates"]["capability"];

  @ApiProperty({ enum: REPOSITORY_AUTOMATION_CONFIGURATION_STATES })
  configuration!: RepositoryAutomationStatus["automaticUpdates"]["configuration"];

  @ApiProperty({ type: Boolean, enum: [false] })
  enabled!: false;
}

export class RepositoryAutomationStatusResponseDto implements RepositoryAutomationStatus {
  @ApiProperty({ type: () => AutomaticUpdatesStatusDto })
  automaticUpdates!: AutomaticUpdatesStatusDto;
}
