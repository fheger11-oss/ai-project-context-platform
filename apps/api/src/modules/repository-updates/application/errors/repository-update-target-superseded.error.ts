export class RepositoryUpdateTargetSupersededError extends Error {
  constructor() {
    super("Repository change target is no longer the repository remote HEAD.");
    this.name = "RepositoryUpdateTargetSupersededError";
  }
}
