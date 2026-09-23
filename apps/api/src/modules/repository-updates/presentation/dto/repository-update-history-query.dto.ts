import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export const DEFAULT_REPOSITORY_UPDATE_HISTORY_PAGE = 1;
export const DEFAULT_REPOSITORY_UPDATE_HISTORY_PAGE_SIZE = 10;
export const MAX_REPOSITORY_UPDATE_HISTORY_PAGE_SIZE = 50;

export class RepositoryUpdateHistoryQueryDto {
  @ApiPropertyOptional({
    default: DEFAULT_REPOSITORY_UPDATE_HISTORY_PAGE,
    minimum: 1,
    example: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = DEFAULT_REPOSITORY_UPDATE_HISTORY_PAGE;

  @ApiPropertyOptional({
    default: DEFAULT_REPOSITORY_UPDATE_HISTORY_PAGE_SIZE,
    minimum: 1,
    maximum: MAX_REPOSITORY_UPDATE_HISTORY_PAGE_SIZE,
    example: 10
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_REPOSITORY_UPDATE_HISTORY_PAGE_SIZE)
  pageSize = DEFAULT_REPOSITORY_UPDATE_HISTORY_PAGE_SIZE;
}
