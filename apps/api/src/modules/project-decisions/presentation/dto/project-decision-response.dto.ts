import { ApiProperty } from "@nestjs/swagger";
import type {
  ProjectDecision,
  ProjectDecisionListResponse,
  ProjectDecisionStatus
} from "@ai-context/contracts";

import type { ProjectDecisionRecord } from "../../domain/contracts/project-decision-repository.contract.js";
import type { ProjectDecisionListResult } from "../../application/project-decision.service.js";

export class ProjectDecisionResponseDto implements ProjectDecision {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  repositoryId!: string;
  @ApiProperty()
  title!: string;
  @ApiProperty()
  decision!: string;
  @ApiProperty()
  rationale!: string;
  @ApiProperty()
  affectedArea!: string;
  @ApiProperty({ enum: ["ACTIVE", "SUPERSEDED", "ARCHIVED"] })
  status!: ProjectDecisionStatus;
  @ApiProperty({ format: "date-time" })
  decidedAt!: string;
  @ApiProperty({ nullable: true })
  sourceProjectContextId!: string | null;
  @ApiProperty({ nullable: true })
  sourceRepositoryUpdateId!: string | null;
  @ApiProperty({ nullable: true })
  sourceCommitSha!: string | null;
  @ApiProperty({ format: "date-time" })
  createdAt!: string;
  @ApiProperty({ format: "date-time" })
  updatedAt!: string;
}

export class ProjectDecisionListResponseDto implements ProjectDecisionListResponse {
  @ApiProperty({ type: [ProjectDecisionResponseDto] })
  items!: ProjectDecision[];
  @ApiProperty({
    type: "object",
    additionalProperties: false,
    properties: {
      page: { type: "number" },
      pageSize: { type: "number" },
      total: { type: "number" },
      hasNextPage: { type: "boolean" }
    }
  })
  pagination!: ProjectDecisionListResponse["pagination"];
}

export function toProjectDecisionResponse(record: ProjectDecisionRecord): ProjectDecision {
  return {
    ...record,
    decidedAt: record.decidedAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

export function toProjectDecisionListResponse(
  result: ProjectDecisionListResult
): ProjectDecisionListResponse {
  return {
    items: result.items.map(toProjectDecisionResponse),
    pagination: result.pagination
  };
}
