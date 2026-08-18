export class InvalidDocumentFormatError extends Error {
  constructor(readonly format: string) {
    super(`Unsupported document format: ${format}.`);
    this.name = "InvalidDocumentFormatError";
  }
}
