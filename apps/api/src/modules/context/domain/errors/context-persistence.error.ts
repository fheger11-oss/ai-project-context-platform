export class ContextPersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContextPersistenceError";
  }
}
