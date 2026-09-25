import "reflect-metadata";

import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./modules/app/app.module.js";
import { AppConfigService } from "./modules/config/app-config.service.js";
import { GlobalExceptionFilter } from "./shared/filters/global-exception.filter.js";
import { configureApiRouting, githubWebhookPath } from "./shared/http/api-routing.js";
import {
  createRequestBodyParsers,
  createWebhookRawBodyParser
} from "./shared/http/request-body-parsers.js";
import { createSecurityHeadersMiddleware } from "./shared/http/security-headers.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    bufferLogs: true
  });

  const logger = new Logger("Bootstrap");
  const config = app.get(AppConfigService);

  app.useLogger(["error", "warn", "log", "debug", "verbose"]);
  configureApiRouting(app, config);
  app.use(
    githubWebhookPath(config),
    createWebhookRawBodyParser(config.githubWebhookBodyLimitBytes)
  );
  app.use(...createRequestBodyParsers(config.requestBodyLimitBytes));
  app.getHttpAdapter().getInstance().set("trust proxy", config.trustProxy);
  app.use(createSecurityHeadersMiddleware());
  app.enableCors({
    origin: config.corsOrigins,
    credentials: true
  });
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true
    })
  );
  app.useGlobalFilters(new GlobalExceptionFilter(config.isProduction));

  if (config.swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("AI Project Context Platform API")
      .setDescription("Infrastructure foundation for the AI Project Context Platform backend.")
      .setVersion(config.apiVersion)
      .addBearerAuth()
      .addTag("auth")
      .addTag("health")
      .addTag("repositories")
      .addTag("scans")
      .addTag("analyses")
      .addTag("ai-export")
      .addTag("documents")
      .addTag("feedback")
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup(config.swaggerPath, app, document, {
      swaggerOptions: {
        persistAuthorization: true
      }
    });
  }

  await app.listen(config.port, config.host);

  logger.log(
    `API listening on http://${config.host}:${config.port}/${config.apiPrefix}/v${config.apiVersion}`
  );
  if (config.swaggerEnabled) {
    logger.log(`Swagger available at http://${config.host}:${config.port}/${config.swaggerPath}`);
  }
}

void bootstrap();
