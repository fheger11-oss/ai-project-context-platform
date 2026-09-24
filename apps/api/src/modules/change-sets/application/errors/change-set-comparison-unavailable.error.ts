export class ChangeSetComparisonUnavailableError extends Error {
  constructor(readonly reason: "MISSING_BASE_COMMIT" | "MISSING_TARGET_COMMIT") {
    super(
      reason === "MISSING_BASE_COMMIT"
        ? "ChangeSet comparison is unavailable because there is no current context commit."
        : "ChangeSet comparison is unavailable because there is no observed remote HEAD commit."
    );
    this.name = "ChangeSetComparisonUnavailableError";
  }
}
