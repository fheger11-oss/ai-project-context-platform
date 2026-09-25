import { Controller, Headers, Inject, Post, Req, Res } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import type { Request, Response } from "express";

import { GitHubWebhookService } from "./github-webhook.service.js";

@Controller({ path: "webhooks/github", version: "1" })
@SkipThrottle()
export class GitHubWebhookController {
  constructor(@Inject(GitHubWebhookService) private readonly webhooks: GitHubWebhookService) {}

  @Post()
  async receive(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Headers("x-hub-signature-256") signature?: string,
    @Headers("x-github-event") event?: string,
    @Headers("x-github-delivery") deliveryId?: string
  ) {
    const result = await this.webhooks.receive(request.body, signature, event, deliveryId);
    response.status(result.accepted && !result.duplicate ? 202 : 200);
    return result;
  }
}
