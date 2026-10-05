import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";

import { AppConfigService } from "../config/app-config.service.js";

const SIGNATURE_PATTERN = /^sha256=([0-9a-f]{64})$/i;

@Injectable()
export class GitHubWebhookSignatureService {
  constructor(@Inject(AppConfigService) private readonly config: AppConfigService) {}

  verify(rawBody: Buffer, signature: string | undefined): void {
    const secret = this.config.githubWebhookSecret;
    const match = signature?.match(SIGNATURE_PATTERN);
    if (!secret || !match || !Buffer.isBuffer(rawBody))
      throw new UnauthorizedException("Invalid webhook signature.");
    const supplied = Buffer.from(match[1]!, "hex");
    const expected = createHmac("sha256", secret).update(rawBody).digest();
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      throw new UnauthorizedException("Invalid webhook signature.");
    }
  }
}
