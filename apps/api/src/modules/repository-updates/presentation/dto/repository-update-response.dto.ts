import { ApiProperty } from "@nestjs/swagger";
import type {
  RepositoryFreshnessStatus,
  RepositoryUpdateResponse,
  RepositoryUpdateStatus,
  RepositoryUpdateTriggerType
} from "@ai-context/contracts";

import type { RunRepositoryUpdateResult } from "../../application/run-repository-update.service.js";

export type { RepositoryUpdateResponse };

export class RepositoryUpdateResponseDto implements RepositoryUpdateResponse {
  @ApiProperty()
  noop!: boolean;

  @ApiProperty({ nullable: true })
  updateId!: string | null;

  @ApiProperty({ enum: ["PENDING", "RUNNING", "COMPLETED", "FAILED"], nullable: true })
  status!: RepositoryUpdateStatus | null;

  @ApiProperty({ enum: ["MANUAL", "WEBHOOK", "SYSTEM"] })
  triggerType!: RepositoryUpdateTriggerType;

  @ApiProperty({ nullable: true })
  baseCommitSha!: string | null;

  @ApiProperty()
  targetCommitSha!: string;

  @ApiProperty({ nullable: true })
  scanId!: string | null;

  @ApiProperty({ nullable: true })
  analysisId!: string | null;

  @ApiProperty({ nullable: true })
  projectContextId!: string | null;

  @ApiProperty({ enum: ["UNKNOWN", "FRESH", "STALE", "UPDATE_FAILED"] })
  freshnessStatus!: RepositoryFreshnessStatus;
}

export function toRepositoryUpdateResponse(
  result: RunRepositoryUpdateResult
): RepositoryUpdateResponse {
  return {
    noop: result.noop,
    updateId: result.update?.id ?? null,
    status: result.update?.status ?? null,
    triggerType: result.update?.triggerType ?? "MANUAL",
    baseCommitSha: result.baseCommitSha,
    targetCommitSha: result.targetCommitSha,
    scanId: result.scanId,
    analysisId: result.analysisId,
    projectContextId: result.projectContextId,
    freshnessStatus: result.freshnessStatus
  };
}
