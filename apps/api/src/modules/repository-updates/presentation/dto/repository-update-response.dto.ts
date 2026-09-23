import { ApiProperty } from "@nestjs/swagger";
import type {
  RepositoryCurrentUpdateResponse,
  RepositoryFreshnessStatus,
  RepositoryUpdateDetail,
  RepositoryUpdateHistoryResponse,
  RepositoryUpdateResponse,
  RepositoryUpdateSummary,
  RepositoryUpdateStatus,
  RepositoryUpdateTriggerType
} from "@ai-context/contracts";

import type { RepositoryUpdateHistoryResult } from "../../application/repository-update.service.js";
import type { RunRepositoryUpdateResult } from "../../application/run-repository-update.service.js";
import type { RepositoryUpdateSnapshot } from "../../domain/contracts/repository-update-repository.contract.js";

export type {
  RepositoryCurrentUpdateResponse,
  RepositoryUpdateDetail,
  RepositoryUpdateHistoryResponse,
  RepositoryUpdateResponse,
  RepositoryUpdateSummary
};

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

export class RepositoryUpdateSummaryDto implements RepositoryUpdateSummary {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  repositoryId!: string;

  @ApiProperty({ enum: ["MANUAL", "WEBHOOK", "SYSTEM"] })
  triggerType!: RepositoryUpdateTriggerType;

  @ApiProperty({ enum: ["PENDING", "RUNNING", "COMPLETED", "FAILED"] })
  status!: RepositoryUpdateStatus;

  @ApiProperty({ nullable: true })
  baseCommitSha!: string | null;

  @ApiProperty()
  targetCommitSha!: string;

  @ApiProperty({ format: "date-time", nullable: true })
  startedAt!: string | null;

  @ApiProperty({ format: "date-time", nullable: true })
  completedAt!: string | null;

  @ApiProperty({ format: "date-time", nullable: true })
  failedAt!: string | null;

  @ApiProperty({ nullable: true })
  failureReason!: string | null;

  @ApiProperty({ nullable: true })
  scanId!: string | null;

  @ApiProperty({ nullable: true })
  analysisId!: string | null;

  @ApiProperty({ nullable: true })
  projectContextId!: string | null;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;

  @ApiProperty({ format: "date-time" })
  updatedAt!: string;
}

export class RepositoryUpdateHistoryResponseDto implements RepositoryUpdateHistoryResponse {
  @ApiProperty({ type: [RepositoryUpdateSummaryDto] })
  items!: RepositoryUpdateSummaryDto[];

  @ApiProperty({
    type: "object",
    properties: {
      page: { type: "number" },
      pageSize: { type: "number" },
      total: { type: "number" },
      hasNextPage: { type: "boolean" }
    }
  })
  pagination!: RepositoryUpdateHistoryResponse["pagination"];
}

export class RepositoryCurrentUpdateResponseDto implements RepositoryCurrentUpdateResponse {
  @ApiProperty({ type: RepositoryUpdateSummaryDto, nullable: true })
  update!: RepositoryUpdateSummaryDto | null;
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

export function toRepositoryUpdateSummary(
  update: RepositoryUpdateSnapshot
): RepositoryUpdateSummary {
  return {
    id: update.id,
    repositoryId: update.repositoryId,
    triggerType: update.triggerType,
    status: update.status,
    baseCommitSha: update.baseCommitSha,
    targetCommitSha: update.targetCommitSha,
    startedAt: update.startedAt?.toISOString() ?? null,
    completedAt: update.completedAt?.toISOString() ?? null,
    failedAt: update.failedAt?.toISOString() ?? null,
    failureReason: update.failureReason,
    scanId: update.scanId,
    analysisId: update.analysisId,
    projectContextId: update.projectContextId,
    createdAt: update.createdAt.toISOString(),
    updatedAt: update.updatedAt.toISOString()
  };
}

export function toRepositoryUpdateHistoryResponse(
  result: RepositoryUpdateHistoryResult
): RepositoryUpdateHistoryResponse {
  return {
    items: result.items.map(toRepositoryUpdateSummary),
    pagination: result.pagination
  };
}
