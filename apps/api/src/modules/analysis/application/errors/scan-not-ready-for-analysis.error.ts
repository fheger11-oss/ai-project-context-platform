export class ScanNotReadyForAnalysisError extends Error {
  constructor(readonly scanId: string) {
    super(`Scan ${scanId} is not ready for analysis.`);
    this.name = "ScanNotReadyForAnalysisError";
  }
}
