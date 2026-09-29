export type RepositoryComparisonUnavailableReason =
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_RATE_LIMITED"
  | "PROVIDER_RESPONSE_INDETERMINATE";

export class RepositoryComparisonUnavailableError extends Error {
  constructor(readonly reason: RepositoryComparisonUnavailableReason) {
    super("Repository comparison is temporarily unavailable.");
    this.name = "RepositoryComparisonUnavailableError";
  }
}
