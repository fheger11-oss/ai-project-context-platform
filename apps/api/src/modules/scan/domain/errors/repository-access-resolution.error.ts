export class RepositoryAccessResolutionError extends Error {
  constructor(repositoryId: string, options?: ErrorOptions) {
    super(
      `Repository content access could not be resolved for repository ${repositoryId}.`,
      options
    );
    this.name = "RepositoryAccessResolutionError";
  }
}
