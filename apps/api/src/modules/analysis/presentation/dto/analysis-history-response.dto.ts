import { ApiProperty } from "@nestjs/swagger";
import type { AnalysisHistoryItem, AnalysisHistoryResponse } from "@ai-context/contracts";

import type { AnalysisHistoryItem as DomainAnalysisHistoryItem } from "../../domain/contracts/analysis-repository.contract.js";

export type { AnalysisHistoryItem, AnalysisHistoryResponse };

export class AnalysisHistoryItemDto {
  @ApiProperty()
  analysisId!: string;

  @ApiProperty()
  scanId!: string;

  @ApiProperty()
  analyzerVersion!: string;

  @ApiProperty({ format: "date-time" })
  generatedAt!: string;

  @ApiProperty()
  commitSha!: string;
}

export class AnalysisHistoryResponseDto {
  @ApiProperty({ type: [AnalysisHistoryItemDto] })
  items!: AnalysisHistoryItemDto[];
}

export function toAnalysisHistoryResponse(
  items: readonly DomainAnalysisHistoryItem[]
): AnalysisHistoryResponse {
  return {
    items: items.map((item) => ({
      ...item,
      generatedAt: item.generatedAt.toISOString()
    }))
  };
}
