import { VersioningType } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";

export type ApiRoutingConfig = {
  apiPrefix: string;
  apiVersion: string;
};

export function configureApiRouting(app: INestApplication, config: ApiRoutingConfig): void {
  app.setGlobalPrefix(config.apiPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: config.apiVersion
  });
}

export function githubWebhookPath(config: ApiRoutingConfig): string {
  return `/${config.apiPrefix}/v${config.apiVersion}/webhooks/github`;
}
