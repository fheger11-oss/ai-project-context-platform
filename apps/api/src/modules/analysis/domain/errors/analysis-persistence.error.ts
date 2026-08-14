export class AnalysisPersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalysisPersistenceError";
  }
}
