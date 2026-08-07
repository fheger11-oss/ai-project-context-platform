export class RepositoryProviderAccountResolutionError extends Error {
  constructor(repositoryId: string, options?: ErrorOptions) {
    super(`Provider account could not be resolved for repository ${repositoryId}.`, options);
    this.name = "RepositoryProviderAccountResolutionError";
  }
}
