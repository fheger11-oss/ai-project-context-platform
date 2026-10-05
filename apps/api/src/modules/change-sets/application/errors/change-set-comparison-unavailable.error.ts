import type { RepositoryComparisonUnavailableReason } from "../../domain/errors/repository-comparison-unavailable.error.js";

export type ChangeSetComparisonUnavailableReason =
  "MISSING_BASE_COMMIT" | "MISSING_TARGET_COMMIT" | RepositoryComparisonUnavailableReason;

export class ChangeSetComparisonUnavailableError extends Error {
  constructor(readonly reason: ChangeSetComparisonUnavailableReason) {
    super(message(reason));
    this.name = "ChangeSetComparisonUnavailableError";
  }
}

export function isProviderComparisonUnavailableError(
  error: unknown
): error is ChangeSetComparisonUnavailableError {
  return (
    error instanceof ChangeSetComparisonUnavailableError &&
    error.reason !== "MISSING_BASE_COMMIT" &&
    error.reason !== "MISSING_TARGET_COMMIT"
  );
}

function message(reason: ChangeSetComparisonUnavailableReason): string {
  switch (reason) {
    case "MISSING_BASE_COMMIT":
      return "ChangeSet comparison is unavailable because there is no current context commit.";
    case "MISSING_TARGET_COMMIT":
      return "ChangeSet comparison is unavailable because there is no observed remote HEAD commit.";
    default:
      return "ChangeSet comparison is temporarily unavailable from the repository provider.";
  }
}
