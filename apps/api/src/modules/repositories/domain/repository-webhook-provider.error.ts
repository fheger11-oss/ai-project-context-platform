export type RepositoryWebhookProviderFailure =
  | "ACCESS_DENIED"
  | "AUTHORIZATION_REQUIRED"
  | "CONFIGURATION_INVALID"
  | "NOT_FOUND"
  | "PROVIDER_UNAVAILABLE"
  | "UNKNOWN";

export class RepositoryWebhookProviderError extends Error {
  constructor(readonly failure: RepositoryWebhookProviderFailure) {
    super(`Repository webhook provider operation failed: ${failure}`);
    this.name = "RepositoryWebhookProviderError";
  }
}
