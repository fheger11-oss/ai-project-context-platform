import "reflect-metadata";

import { Logger, ValidationPipe, VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";

import { AppModule } from "./modules/app/app.module.js";
import { AppConfigService } from "./modules/config/app-config.service.js";
import { GlobalExceptionFilter } from "./shared/filters/global-exception.filter.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });

  const logger = new Logger("Bootstrap");
  const config = app.get(AppConfigService);

  app.useLogger(["error", "warn", "log", "debug", "verbose"]);
  app.use(helmet());
  app.enableCors({
    origin: config.corsOrigins,
    credentials: true
  });
  app.enableShutdownHooks();
  app.setGlobalPrefix(config.apiPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: config.apiVersion
  });
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true
    })
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle("AI Project Context Platform API")
    .setDescription("Infrastructure foundation for the AI Project Context Platform backend.")
    .setVersion(config.apiVersion)
    .addTag("health")
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup(config.swaggerPath, app, document, {
    swaggerOptions: {
      persistAuthorization: true
    }
  });

  await app.listen(config.port, config.host);

  logger.log(
    `API listening on http://${config.host}:${config.port}/${config.apiPrefix}/v${config.apiVersion}`
  );
  logger.log(`Swagger available at http://${config.host}:${config.port}/${config.swaggerPath}`);
}

void bootstrap();
