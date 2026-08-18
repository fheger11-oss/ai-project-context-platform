export class InvalidGeneratedDocumentError extends Error {
  constructor(field: string) {
    super(`GeneratedDocument requires ${field}`);
    this.name = "InvalidGeneratedDocumentError";
  }
}
