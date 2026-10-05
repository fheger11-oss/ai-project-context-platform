import { ApiProperty } from "@nestjs/swagger";

import {
  REPOSITORY_AUTOMATION_CAPABILITIES,
  REPOSITORY_AUTOMATION_CONFIGURATION_STATES,
  REPOSITORY_AUTOMATION_OUTCOMES
} from "../domain/repository-automation-status.js";
import type { RepositoryAutomationStatus } from "../domain/repository-automation-status.js";

class AutomaticUpdatesStatusDto {
  @ApiProperty({ enum: REPOSITORY_AUTOMATION_CAPABILITIES })
  capability!: RepositoryAutomationStatus["automaticUpdates"]["capability"];

  @ApiProperty({ enum: REPOSITORY_AUTOMATION_CONFIGURATION_STATES })
  configuration!: RepositoryAutomationStatus["automaticUpdates"]["configuration"];

  @ApiProperty({ type: Boolean })
  enabled!: boolean;

  @ApiProperty({ enum: REPOSITORY_AUTOMATION_OUTCOMES, nullable: true })
  lastOutcome!: RepositoryAutomationStatus["automaticUpdates"]["lastOutcome"];

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  lastVerifiedAt!: Date | null;
}

export class RepositoryAutomationStatusResponseDto implements RepositoryAutomationStatus {
  @ApiProperty({ type: () => AutomaticUpdatesStatusDto })
  automaticUpdates!: AutomaticUpdatesStatusDto;
}
