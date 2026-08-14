export class InvalidPersistedAnalysisResultError extends Error {
  constructor(
    readonly analysisId: string,
    message: string
  ) {
    super(`Persisted analysis result ${analysisId} is invalid: ${message}`);
    this.name = "InvalidPersistedAnalysisResultError";
  }
}
