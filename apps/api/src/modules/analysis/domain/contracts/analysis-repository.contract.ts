import type { Analysis } from "../analysis.js";
import type { AnalysisResult } from "./analysis-result.contract.js";

export const ANALYSIS_REPOSITORY = Symbol("ANALYSIS_REPOSITORY");

export interface AnalysisRepository {
  save(analysis: Analysis): Promise<Analysis>;
  saveResult(result: AnalysisResult): Promise<AnalysisResult>;
  findById(analysisId: string): Promise<Analysis | null>;
  findResultById(analysisId: string): Promise<AnalysisResult | null>;
  findByScanId(scanId: string): Promise<Analysis | null>;
}
