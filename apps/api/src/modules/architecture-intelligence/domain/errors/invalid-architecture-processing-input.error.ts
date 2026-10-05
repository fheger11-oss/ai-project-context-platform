export class InvalidArchitectureProcessingInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidArchitectureProcessingInputError";
  }
}
