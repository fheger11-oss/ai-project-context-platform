import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { afterEach, describe, expect, it } from "vitest";

import { GitHubWebhookController } from "../../modules/webhooks/github-webhook.controller.js";
import { GitHubWebhookService } from "../../modules/webhooks/github-webhook.service.js";
import { configureApiRouting, githubWebhookPath } from "./api-routing.js";

@Module({
  controllers: [GitHubWebhookController],
  providers: [{ provide: GitHubWebhookService, useValue: { receive: async () => undefined } }]
})
class RoutingTestModule {}

describe("API URI routing", () => {
  let close: (() => Promise<void>) | undefined;

  afterEach(async () => {
    await close?.();
    close = undefined;
  });

  it("maps the GitHub webhook to exactly /api/v1/webhooks/github", async () => {
    const app = await NestFactory.create(RoutingTestModule, { logger: false });
    close = () => app.close();
    const config = { apiPrefix: "api", apiVersion: "1" };

    configureApiRouting(app, config);
    await app.init();

    const paths = registeredPostPaths(app.getHttpAdapter().getInstance());
    expect(paths).toContain(githubWebhookPath(config));
    expect(paths).not.toContain("/api/webhooks/github");
    expect(paths).not.toContain("/api/webhooks/github/v1");
  });
});

function registeredPostPaths(express: {
  router: { stack: Array<{ route?: { path?: unknown; methods?: Record<string, boolean> } }> };
}): string[] {
  return express.router.stack
    .filter((layer) => layer.route?.methods?.post === true && typeof layer.route.path === "string")
    .map((layer) => layer.route!.path as string);
}
