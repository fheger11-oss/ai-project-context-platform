import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export const DEFAULT_SCAN_HISTORY_PAGE = 1;
export const DEFAULT_SCAN_HISTORY_PAGE_SIZE = 20;
export const MAX_SCAN_HISTORY_PAGE_SIZE = 100;

export class ScanHistoryQueryDto {
  @ApiPropertyOptional({
    default: DEFAULT_SCAN_HISTORY_PAGE,
    minimum: 1,
    example: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = DEFAULT_SCAN_HISTORY_PAGE;

  @ApiPropertyOptional({
    default: DEFAULT_SCAN_HISTORY_PAGE_SIZE,
    minimum: 1,
    maximum: MAX_SCAN_HISTORY_PAGE_SIZE,
    example: 20
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_SCAN_HISTORY_PAGE_SIZE)
  pageSize = DEFAULT_SCAN_HISTORY_PAGE_SIZE;
}
