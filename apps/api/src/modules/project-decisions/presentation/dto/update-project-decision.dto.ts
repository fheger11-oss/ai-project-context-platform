import { Transform } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import type { ProjectDecisionStatus, UpdateProjectDecisionRequest } from "@ai-context/contracts";

import {
  PROJECT_DECISION_AFFECTED_AREA_MAX_LENGTH,
  PROJECT_DECISION_TEXT_MAX_LENGTH,
  PROJECT_DECISION_TITLE_MAX_LENGTH
} from "../../domain/project-decision.js";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);
const statuses = ["ACTIVE", "SUPERSEDED", "ARCHIVED"] as const;

export class UpdateProjectDecisionDto implements UpdateProjectDecisionRequest {
  @ApiPropertyOptional({ maxLength: PROJECT_DECISION_TITLE_MAX_LENGTH })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(PROJECT_DECISION_TITLE_MAX_LENGTH)
  title?: string;

  @ApiPropertyOptional({ maxLength: PROJECT_DECISION_TEXT_MAX_LENGTH })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(PROJECT_DECISION_TEXT_MAX_LENGTH)
  decision?: string;

  @ApiPropertyOptional({ maxLength: PROJECT_DECISION_TEXT_MAX_LENGTH })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(PROJECT_DECISION_TEXT_MAX_LENGTH)
  rationale?: string;

  @ApiPropertyOptional({ maxLength: PROJECT_DECISION_AFFECTED_AREA_MAX_LENGTH })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(PROJECT_DECISION_AFFECTED_AREA_MAX_LENGTH)
  affectedArea?: string;

  @ApiPropertyOptional({ format: "date-time" })
  @IsOptional()
  @IsISO8601({ strict: true })
  decidedAt?: string;

  @ApiPropertyOptional({ enum: statuses })
  @IsOptional()
  @IsEnum(statuses)
  status?: ProjectDecisionStatus;
}
