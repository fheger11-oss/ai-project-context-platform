import { Transform } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import type { ProjectKnowledgeStatus, UpdateProjectKnowledgeRequest } from "@ai-context/contracts";

import { PROJECT_KNOWLEDGE_CONTENT_MAX_LENGTH } from "../../domain/project-knowledge.js";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);
const statuses = ["ACTIVE", "SUPERSEDED", "ARCHIVED"] as const;

export class UpdateProjectKnowledgeDto implements UpdateProjectKnowledgeRequest {
  @ApiPropertyOptional({ maxLength: PROJECT_KNOWLEDGE_CONTENT_MAX_LENGTH })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(PROJECT_KNOWLEDGE_CONTENT_MAX_LENGTH)
  content?: string;

  @ApiPropertyOptional({ enum: statuses })
  @IsOptional()
  @IsEnum(statuses)
  status?: ProjectKnowledgeStatus;
}
