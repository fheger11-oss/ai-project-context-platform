import type { Analysis } from "../analysis.js";

export const ANALYSIS_REPOSITORY = Symbol("ANALYSIS_REPOSITORY");

export interface AnalysisRepository {
  save(analysis: Analysis): Promise<Analysis>;
  findById(analysisId: string): Promise<Analysis | null>;
  findByScanId(scanId: string): Promise<Analysis | null>;
}
