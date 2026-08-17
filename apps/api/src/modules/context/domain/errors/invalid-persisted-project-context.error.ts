export class InvalidPersistedProjectContextError extends Error {
  constructor(
    readonly contextRecordId: string,
    message: string
  ) {
    super(`Persisted ProjectContext ${contextRecordId} is invalid: ${message}`);
    this.name = "InvalidPersistedProjectContextError";
  }
}
