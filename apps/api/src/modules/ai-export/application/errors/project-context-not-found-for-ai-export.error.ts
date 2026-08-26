export class ProjectContextNotFoundForAiExportError extends Error {
  constructor(readonly contextId: string) {
    super(`ProjectContext was not found for AI export: ${contextId}`);
    this.name = "ProjectContextNotFoundForAiExportError";
  }
}
