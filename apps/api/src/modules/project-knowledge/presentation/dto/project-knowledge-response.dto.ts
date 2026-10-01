import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { ProjectKnowledge, ProjectKnowledgeListResponse } from "@ai-context/contracts";

import type { ProjectKnowledgeListResult } from "../../application/project-knowledge.service.js";
import type { ProjectKnowledgeRecord } from "../../domain/contracts/project-knowledge-repository.contract.js";

export class ProjectKnowledgeResponseDto implements ProjectKnowledge {
  @ApiProperty() id!: string;
  @ApiProperty() repositoryId!: string;
  @ApiProperty() content!: string;
  @ApiProperty({ enum: ["ACTIVE", "SUPERSEDED", "ARCHIVED"] }) status!: ProjectKnowledge["status"];
  @ApiProperty({ enum: ["USER_AUTHORED", "SYSTEM_DERIVED"] }) origin!: ProjectKnowledge["origin"];
  @ApiProperty({ enum: ["USER_ASSERTED", "OBSERVED", "INFERRED"] }) kind!: ProjectKnowledge["kind"];
  @ApiProperty({ enum: ["USER", "REPOSITORY", "PROJECT_CONTEXT", "PROJECT_DECISION"] })
  sourceType!: ProjectKnowledge["sourceType"];
  @ApiPropertyOptional({ enum: ["LOW", "MEDIUM", "HIGH"], nullable: true })
  confidence!: ProjectKnowledge["confidence"];
  @ApiPropertyOptional({ nullable: true }) sourceProjectContextId!: string | null;
  @ApiPropertyOptional({ nullable: true }) sourceProjectDecisionId!: string | null;
  @ApiPropertyOptional({ format: "date-time", nullable: true }) verifiedAt!: string | null;
  @ApiProperty({ format: "date-time" }) createdAt!: string;
  @ApiProperty({ format: "date-time" }) updatedAt!: string;
}

class ProjectKnowledgePaginationDto {
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty() hasNextPage!: boolean;
}

export class ProjectKnowledgeListResponseDto implements ProjectKnowledgeListResponse {
  @ApiProperty({ type: [ProjectKnowledgeResponseDto] }) items!: ProjectKnowledge[];
  @ApiProperty({ type: ProjectKnowledgePaginationDto })
  pagination!: ProjectKnowledgeListResponse["pagination"];
}

export function toProjectKnowledgeResponse(record: ProjectKnowledgeRecord): ProjectKnowledge {
  return {
    ...record,
    verifiedAt: record.verifiedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

export function toProjectKnowledgeListResponse(
  result: ProjectKnowledgeListResult
): ProjectKnowledgeListResponse {
  return { items: result.items.map(toProjectKnowledgeResponse), pagination: result.pagination };
}
