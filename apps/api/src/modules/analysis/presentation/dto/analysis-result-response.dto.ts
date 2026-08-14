import { ApiProperty } from "@nestjs/swagger";

import type { AnalysisResult } from "../../domain/contracts/analysis-result.contract.js";

export type AnalysisResultResponse = Omit<AnalysisResult, "generatedAt"> & {
  generatedAt: string;
};

export class AnalysisResultResponseDto {
  @ApiProperty()
  analysisId!: string;

  @ApiProperty()
  scanId!: string;

  @ApiProperty()
  repositoryId!: string;

  @ApiProperty()
  commitSha!: string;

  @ApiProperty()
  analyzerVersion!: string;

  @ApiProperty({ format: "date-time" })
  generatedAt!: string;

  @ApiProperty({ type: "object", additionalProperties: true })
  project!: unknown;

  @ApiProperty({ type: "array", items: { type: "object", additionalProperties: true } })
  files!: unknown[];

  @ApiProperty({ type: "array", items: { type: "object", additionalProperties: true } })
  sourceStructures!: unknown[];

  @ApiProperty({ type: "array", items: { type: "object", additionalProperties: true } })
  relationships!: unknown[];

  @ApiProperty({ type: "array", items: { type: "object", additionalProperties: true } })
  dependencies!: unknown[];

  @ApiProperty({ type: "array", items: { type: "object", additionalProperties: true } })
  issues!: unknown[];
}

export function toAnalysisResultResponse(result: AnalysisResult): AnalysisResultResponse {
  return {
    ...result,
    generatedAt: result.generatedAt.toISOString()
  };
}
