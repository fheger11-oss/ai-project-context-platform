export class InvalidAnalysisPipelineContextError extends Error {
  constructor(
    readonly analysisScanId: string,
    readonly inputScanId: string
  ) {
    super(
      `Analysis pipeline context mismatch: analysis scanId=${analysisScanId}, input scanId=${inputScanId}.`
    );
    this.name = "InvalidAnalysisPipelineContextError";
  }
}
