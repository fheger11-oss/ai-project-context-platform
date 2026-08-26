export class InvalidAiExportFormatError extends Error {
  constructor(format: string) {
    super(`Unsupported AI export format: ${format}`);
    this.name = "InvalidAiExportFormatError";
  }
}
