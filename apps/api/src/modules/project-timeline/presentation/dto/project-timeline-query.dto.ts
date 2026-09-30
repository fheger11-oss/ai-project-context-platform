import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export const DEFAULT_PROJECT_TIMELINE_PAGE = 1;
export const DEFAULT_PROJECT_TIMELINE_PAGE_SIZE = 20;
export const MAX_PROJECT_TIMELINE_PAGE_SIZE = 50;

export class ProjectTimelineQueryDto {
  @ApiPropertyOptional({ default: DEFAULT_PROJECT_TIMELINE_PAGE, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = DEFAULT_PROJECT_TIMELINE_PAGE;

  @ApiPropertyOptional({
    default: DEFAULT_PROJECT_TIMELINE_PAGE_SIZE,
    minimum: 1,
    maximum: MAX_PROJECT_TIMELINE_PAGE_SIZE
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PROJECT_TIMELINE_PAGE_SIZE)
  pageSize = DEFAULT_PROJECT_TIMELINE_PAGE_SIZE;
}
