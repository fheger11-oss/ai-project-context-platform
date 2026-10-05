import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";
import type {
  ArchitectureFindingLifecycle,
  ArchitectureIntelligenceConfidence
} from "@ai-context/contracts";

const confidences = ["LOW", "MEDIUM", "HIGH"] as const;
const lifecycles = ["NEW", "PERSISTING", "RESOLVED", "RECURRING"] as const;
const rules = ["architecture.circular-dependency"] as const;

export class ArchitectureIntelligenceQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 20;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  modulePage = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  modulePageSize = 20;

  @ApiPropertyOptional({ enum: rules })
  @IsOptional()
  @IsIn(rules)
  ruleId?: string;

  @ApiPropertyOptional({ enum: confidences })
  @IsOptional()
  @IsIn(confidences)
  confidence?: ArchitectureIntelligenceConfidence;

  @ApiPropertyOptional({ enum: lifecycles })
  @IsOptional()
  @IsIn(lifecycles)
  lifecycle?: ArchitectureFindingLifecycle;
}

export class ArchitectureIntelligenceHistoryQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 20;
}
