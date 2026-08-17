import type { ContextInput } from "./context-input.contract.js";

export const ANALYSIS_CONTEXT_READER = Symbol("ANALYSIS_CONTEXT_READER");

export type ReadAnalysisForContextInput = {
  userId: string;
  analysisId: string;
};

export interface AnalysisContextReader {
  readAnalysisForContext(input: ReadAnalysisForContextInput): Promise<ContextInput | null>;
}
