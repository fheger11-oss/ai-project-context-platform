import { Module } from "@nestjs/common";
import type { MiddlewareConsumer, NestModule } from "@nestjs/common";

import { RequestLoggerMiddleware } from "../../shared/middleware/request-logger.middleware.js";
import { AppConfigModule } from "../config/app-config.module.js";
import { HealthModule } from "../health/health.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";

@Module({
  imports: [AppConfigModule, PrismaModule, HealthModule]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes("{*path}");
  }
}
