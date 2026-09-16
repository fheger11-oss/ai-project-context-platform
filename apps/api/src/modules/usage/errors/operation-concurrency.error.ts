import { HttpException, HttpStatus } from "@nestjs/common";

export type OperationConcurrencyDetails = {
  operationType: string;
  lockKey: string;
  expiresAt: Date | null;
};

export class OperationConcurrencyError extends HttpException {
  readonly details: OperationConcurrencyDetails;

  constructor(details: OperationConcurrencyDetails) {
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: "Another operation is already running. Try again shortly.",
        error: "Operation Concurrency Limit Reached",
        concurrency: {
          operationType: details.operationType,
          lockKey: details.lockKey,
          expiresAt: details.expiresAt ? details.expiresAt.toISOString() : null
        }
      },
      HttpStatus.TOO_MANY_REQUESTS
    );
    this.name = "OperationConcurrencyError";
    this.details = details;
  }
}
