import { Module } from "@nestjs/common";
import type { MiddlewareConsumer, NestModule } from "@nestjs/common";

import { RequestLoggerMiddleware } from "../../shared/middleware/request-logger.middleware.js";
import { AiExportModule } from "../ai-export/ai-export.module.js";
import { AnalysisModule } from "../analysis/analysis.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { AppConfigModule } from "../config/app-config.module.js";
import { ContextModule } from "../context/context.module.js";
import { DocumentGenerationModule } from "../document-generation/document-generation.module.js";
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
    AnalysisModule,
    ContextModule,
    DocumentGenerationModule,
    AiExportModule,
    HealthModule
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes("{*path}");
  }
}
