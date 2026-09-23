import type { RepositoryUpdateStatus } from "../../../../generated/prisma/enums.js";

export class RepositoryUpdateNotFoundError extends Error {
  constructor(updateId: string) {
    super(`RepositoryUpdate ${updateId} was not found.`);
    this.name = "RepositoryUpdateNotFoundError";
  }
}

export class RepositoryUpdateInvalidTransitionError extends Error {
  constructor(input: {
    updateId: string;
    from: RepositoryUpdateStatus;
    to: RepositoryUpdateStatus;
  }) {
    super(
      `RepositoryUpdate ${input.updateId} cannot transition from ${input.from} to ${input.to}.`
    );
    this.name = "RepositoryUpdateInvalidTransitionError";
  }
}

export class RepositoryUpdateFailureReasonError extends Error {
  constructor() {
    super("RepositoryUpdate failure reason is required.");
    this.name = "RepositoryUpdateFailureReasonError";
  }
}
