export class InvalidRepositoryChangeTriggerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidRepositoryChangeTriggerError";
  }
}

export class RepositoryChangeProviderIdentityMismatchError extends Error {
  constructor() {
    super("Repository change provider identity does not match the connected repository.");
    this.name = "RepositoryChangeProviderIdentityMismatchError";
  }
}

export class RepositoryChangeIdentityMismatchError extends Error {
  constructor() {
    super("Repository change identity does not match the connected repository.");
    this.name = "RepositoryChangeIdentityMismatchError";
  }
}
