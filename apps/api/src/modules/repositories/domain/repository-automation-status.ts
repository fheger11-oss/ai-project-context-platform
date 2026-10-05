export const REPOSITORY_AUTOMATION_CAPABILITIES = [
  "CAN_MANAGE_WEBHOOK",
  "CANNOT_MANAGE_WEBHOOK",
  "PROVIDER_ACCESS_DENIED",
  "PROVIDER_REPOSITORY_NOT_FOUND",
  "PROVIDER_AUTHORIZATION_REQUIRED",
  "PROVIDER_UNAVAILABLE"
] as const;

export type RepositoryAutomationCapability = (typeof REPOSITORY_AUTOMATION_CAPABILITIES)[number];

export const REPOSITORY_AUTOMATION_CONFIGURATION_STATES = [
  "NOT_CONFIGURED",
  "PROVISIONING",
  "ENABLED",
  "REQUIRES_ADMIN",
  "REQUIRES_AUTHORIZATION",
  "UNAVAILABLE",
  "FAILED",
  "CLEANUP_PENDING"
] as const;

export const REPOSITORY_AUTOMATION_OUTCOMES = [
  "WEBHOOK_CREATED",
  "WEBHOOK_ALREADY_CONFIGURED",
  "WEBHOOK_UPDATED",
  "WEBHOOK_NOT_AUTHORIZED",
  "WEBHOOK_PROVIDER_UNAVAILABLE",
  "WEBHOOK_CONFIGURATION_INVALID",
  "WEBHOOK_NOT_FOUND",
  "WEBHOOK_UNKNOWN_FAILURE",
  "WEBHOOK_DELETED",
  "WEBHOOK_ALREADY_DELETED",
  "WEBHOOK_CLEANUP_PENDING"
] as const;

export type RepositoryAutomationStatus = {
  automaticUpdates: {
    capability: RepositoryAutomationCapability;
    configuration: (typeof REPOSITORY_AUTOMATION_CONFIGURATION_STATES)[number];
    enabled: boolean;
    lastOutcome: (typeof REPOSITORY_AUTOMATION_OUTCOMES)[number] | null;
    lastVerifiedAt: Date | null;
  };
};

export function repositoryAutomationStatus(
  capability: RepositoryAutomationCapability,
  configuration: RepositoryAutomationStatus["automaticUpdates"]["configuration"] = "NOT_CONFIGURED",
  metadata: Pick<
    RepositoryAutomationStatus["automaticUpdates"],
    "lastOutcome" | "lastVerifiedAt"
  > = { lastOutcome: null, lastVerifiedAt: null }
): RepositoryAutomationStatus {
  return {
    automaticUpdates: {
      capability,
      configuration,
      enabled: configuration === "ENABLED",
      ...metadata
    }
  };
}
