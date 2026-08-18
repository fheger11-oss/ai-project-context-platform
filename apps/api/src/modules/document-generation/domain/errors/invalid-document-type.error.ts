export class InvalidDocumentTypeError extends Error {
  constructor(readonly documentType: string) {
    super(`Unsupported document type: ${documentType}.`);
    this.name = "InvalidDocumentTypeError";
  }
}
