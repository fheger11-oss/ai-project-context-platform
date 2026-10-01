import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";
import type { ProjectKnowledgeStatus } from "@ai-context/contracts";

const statuses = ["ACTIVE", "SUPERSEDED", "ARCHIVED"] as const;

export class ProjectKnowledgeQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 10;

  @ApiPropertyOptional({ enum: statuses })
  @IsOptional()
  @IsEnum(statuses)
  status?: ProjectKnowledgeStatus;
}
