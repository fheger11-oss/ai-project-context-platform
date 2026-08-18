export class DocumentNotFoundError extends Error {
  constructor(documentId: string) {
    super(`Document was not found: ${documentId}`);
    this.name = "DocumentNotFoundError";
  }
}
