import { UnauthorizedException } from "@nestjs/common";
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { GitHubWebhookSignatureService } from "./github-webhook-signature.service.js";

const secret = "webhook-secret-at-least-thirty-two-characters";
const body = Buffer.from('{"exact":"bytes"}\n');
const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

describe("GitHubWebhookSignatureService", () => {
  const service = new GitHubWebhookSignatureService({ githubWebhookSecret: secret } as never);
  it("accepts a valid HMAC over the exact raw bytes", () =>
    expect(() => service.verify(body, signature)).not.toThrow());
  it.each([undefined, "sha1=bad", `sha256=${"0".repeat(64)}`])(
    "rejects missing, malformed, and invalid signatures",
    (value) => expect(() => service.verify(body, value)).toThrow(UnauthorizedException)
  );
  it("rejects a signature generated from reserialized bytes", () =>
    expect(() => service.verify(Buffer.from('{"exact":"bytes"}'), signature)).toThrow(
      UnauthorizedException
    ));
});
