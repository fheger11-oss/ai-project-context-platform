import { Injectable, Logger } from "@nestjs/common";
import type { NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

import { safeRequestPath } from "../http/safe-request-path.js";

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggerMiddleware.name);

  use(request: Request, response: Response, next: NextFunction) {
    const startedAt = process.hrtime.bigint();

    response.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const message = `${request.method} ${safeRequestPath(request)} ${response.statusCode} ${durationMs.toFixed(1)}ms`;

      if (response.statusCode >= 500) {
        this.logger.error(message);
        return;
      }

      if (response.statusCode >= 400) {
        this.logger.warn(message);
        return;
      }

      this.logger.log(message);
    });

    next();
  }
}
