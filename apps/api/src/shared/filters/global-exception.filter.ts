import { Catch, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import type { Request, Response } from "express";

import { safeRequestPath } from "../http/safe-request-path.js";

type ErrorResponse = {
  statusCode: number;
  message: string | string[];
  error?: string;
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly production = false) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = this.toPayload(exception, status);

    if (status >= 500) {
      const errorName = exception instanceof Error ? exception.name : typeof exception;
      this.logger.error(`${request.method} ${safeRequestPath(request)} ${status} ${errorName}`);
    }

    response.status(status).json({
      ...payload,
      path: safeRequestPath(request),
      timestamp: new Date().toISOString()
    });
  }

  private toPayload(exception: unknown, status: number): ErrorResponse {
    if (this.production && status >= 500) {
      return {
        statusCode: status,
        message: "Internal server error",
        error: "Internal Server Error"
      };
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (typeof response === "object" && response !== null) {
        return response as ErrorResponse;
      }

      return {
        statusCode: status,
        message: String(response)
      };
    }

    return {
      statusCode: status,
      message: "Internal server error",
      error: "Internal Server Error"
    };
  }
}
