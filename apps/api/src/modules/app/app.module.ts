import { Module } from "@nestjs/common";
import type { MiddlewareConsumer, NestModule } from "@nestjs/common";

import { RequestLoggerMiddleware } from "../../shared/middleware/request-logger.middleware.js";
import { AuthModule } from "../auth/auth.module.js";
import { AppConfigModule } from "../config/app-config.module.js";
import { HealthModule } from "../health/health.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { RepositoriesModule } from "../repositories/repositories.module.js";
import { ScanModule } from "../scan/scan.module.js";
import { UsersModule } from "../users/users.module.js";

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    RepositoriesModule,
    ScanModule,
    HealthModule
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes("{*path}");
  }
}
