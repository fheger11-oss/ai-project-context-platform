import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength
} from "class-validator";
import type { CreateProjectDecisionRequest } from "@ai-context/contracts";

import {
  FULL_GIT_SHA_PATTERN,
  PROJECT_DECISION_AFFECTED_AREA_MAX_LENGTH,
  PROJECT_DECISION_TEXT_MAX_LENGTH,
  PROJECT_DECISION_TITLE_MAX_LENGTH
} from "../../domain/project-decision.js";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);
const SOURCE_ID_PATTERN = /^[a-z0-9]+$/i;

export class CreateProjectDecisionDto implements CreateProjectDecisionRequest {
  @ApiProperty({ maxLength: PROJECT_DECISION_TITLE_MAX_LENGTH })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(PROJECT_DECISION_TITLE_MAX_LENGTH)
  title!: string;

  @ApiProperty({ maxLength: PROJECT_DECISION_TEXT_MAX_LENGTH })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(PROJECT_DECISION_TEXT_MAX_LENGTH)
  decision!: string;

  @ApiProperty({ maxLength: PROJECT_DECISION_TEXT_MAX_LENGTH })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(PROJECT_DECISION_TEXT_MAX_LENGTH)
  rationale!: string;

  @ApiProperty({ maxLength: PROJECT_DECISION_AFFECTED_AREA_MAX_LENGTH })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(PROJECT_DECISION_AFFECTED_AREA_MAX_LENGTH)
  affectedArea!: string;

  @ApiProperty({ format: "date-time" })
  @IsISO8601({ strict: true })
  decidedAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(32)
  @Matches(SOURCE_ID_PATTERN)
  sourceProjectContextId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(32)
  @Matches(SOURCE_ID_PATTERN)
  sourceRepositoryUpdateId?: string;

  @ApiPropertyOptional({ description: "Full 40-character Git commit SHA" })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Matches(FULL_GIT_SHA_PATTERN)
  sourceCommitSha?: string;
}
