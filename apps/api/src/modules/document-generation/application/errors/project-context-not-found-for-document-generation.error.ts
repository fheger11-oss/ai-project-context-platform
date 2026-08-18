export class ProjectContextNotFoundForDocumentGenerationError extends Error {
  constructor(readonly contextId: string) {
    super(`ProjectContext ${contextId} was not found for document generation.`);
    this.name = "ProjectContextNotFoundForDocumentGenerationError";
  }
}
