import { ApiProperty } from "@nestjs/swagger";
import type { RepositoryFreshnessStatus, RepositoryStateSummary } from "@ai-context/contracts";

import type { RepositoryStateSnapshot } from "../repository-state.service.js";

export type { RepositoryStateSummary };

export class RepositoryStateResponseDto {
  @ApiProperty()
  repositoryId!: string;

  @ApiProperty({ enum: ["UNKNOWN", "FRESH", "STALE", "UPDATE_FAILED"] })
  freshnessStatus!: RepositoryFreshnessStatus;

  @ApiProperty({ nullable: true })
  remoteHeadCommitSha!: string | null;

  @ApiProperty({ format: "date-time", nullable: true })
  remoteHeadCheckedAt!: string | null;

  @ApiProperty({ nullable: true })
  lastScannedCommitSha!: string | null;

  @ApiProperty({ nullable: true })
  lastAnalyzedCommitSha!: string | null;

  @ApiProperty({ nullable: true })
  currentProjectContextId!: string | null;

  @ApiProperty({ nullable: true })
  currentContextCommitSha!: string | null;

  @ApiProperty({ nullable: true })
  lastUpdateStatus!: string | null;
}

export function toRepositoryStateSummary(state: RepositoryStateSnapshot): RepositoryStateSummary {
  return {
    repositoryId: state.repositoryId,
    freshnessStatus: state.freshnessStatus,
    remoteHeadCommitSha: state.remoteHeadCommitSha,
    remoteHeadCheckedAt: state.remoteHeadCheckedAt?.toISOString() ?? null,
    lastScannedCommitSha: state.lastScannedCommitSha,
    lastAnalyzedCommitSha: state.lastAnalyzedCommitSha,
    currentProjectContextId: state.currentProjectContextId,
    currentContextCommitSha: state.currentContextCommitSha,
    lastUpdateStatus: state.lastUpdateStatus
  };
}
