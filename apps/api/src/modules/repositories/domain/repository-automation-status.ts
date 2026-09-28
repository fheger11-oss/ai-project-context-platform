export const REPOSITORY_AUTOMATION_CAPABILITIES = [
  "CAN_MANAGE_WEBHOOK",
  "CANNOT_MANAGE_WEBHOOK",
  "PROVIDER_ACCESS_DENIED",
  "PROVIDER_REPOSITORY_NOT_FOUND",
  "PROVIDER_AUTHORIZATION_REQUIRED",
  "PROVIDER_UNAVAILABLE"
] as const;

export type RepositoryAutomationCapability = (typeof REPOSITORY_AUTOMATION_CAPABILITIES)[number];

export const REPOSITORY_AUTOMATION_CONFIGURATION_STATES = ["NOT_CONFIGURED"] as const;

export type RepositoryAutomationStatus = {
  automaticUpdates: {
    capability: RepositoryAutomationCapability;
    configuration: (typeof REPOSITORY_AUTOMATION_CONFIGURATION_STATES)[number];
    enabled: false;
  };
};

export function repositoryAutomationStatus(
  capability: RepositoryAutomationCapability
): RepositoryAutomationStatus {
  return {
    automaticUpdates: {
      capability,
      configuration: "NOT_CONFIGURED",
      enabled: false
    }
  };
}
