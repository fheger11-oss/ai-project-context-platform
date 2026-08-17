export class InvalidProjectContextProvenanceError extends Error {
  constructor(field: string) {
    super(`ProjectContext provenance requires ${field}`);
    this.name = "InvalidProjectContextProvenanceError";
  }
}
