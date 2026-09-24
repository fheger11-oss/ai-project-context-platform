export class IncrementalProcessingUnavailableError extends Error {
  constructor() {
    super("Incremental repository processing is not available.");
    this.name = "IncrementalProcessingUnavailableError";
  }
}
