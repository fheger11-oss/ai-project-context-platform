import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";

import { GitHubWebhookDispatchRepository } from "./github-webhook-dispatch.repository.js";
import { GitHubWebhookSignatureService } from "./github-webhook-signature.service.js";

const DELIVERY_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const ZERO_SHA = /^0{40}$/;

export type WebhookAcknowledgement = { accepted: boolean; duplicate: boolean; outcome: string };

@Injectable()
export class GitHubWebhookService {
  private readonly logger = new Logger(GitHubWebhookService.name);
  constructor(
    @Inject(GitHubWebhookSignatureService)
    private readonly signatures: GitHubWebhookSignatureService,
    @Inject(GitHubWebhookDispatchRepository)
    private readonly repository: GitHubWebhookDispatchRepository
  ) {}

  async receive(
    rawBody: unknown,
    signature: string | undefined,
    event: string | undefined,
    deliveryId: string | undefined
  ): Promise<WebhookAcknowledgement> {
    if (!Buffer.isBuffer(rawBody)) throw new BadRequestException("Webhook body must be raw JSON.");
    this.signatures.verify(rawBody, signature);
    if (!deliveryId || !DELIVERY_PATTERN.test(deliveryId))
      throw new BadRequestException("Invalid GitHub delivery ID.");
    if (!event || !/^[a-z_]{1,40}$/.test(event))
      throw new BadRequestException("Invalid GitHub event.");
    if (event === "ping") return { accepted: false, duplicate: false, outcome: "IGNORED_PING" };
    if (event !== "push")
      return { accepted: false, duplicate: false, outcome: "IGNORED_UNSUPPORTED_EVENT" };

    const payload = parsePushPayload(rawBody);
    if (payload.deleted || ZERO_SHA.test(payload.after))
      return { accepted: false, duplicate: false, outcome: "IGNORED_DELETION" };
    const repositories = await this.repository.findConnectedRepositories(
      String(payload.repository.id)
    );
    if (repositories.length === 0)
      return { accepted: false, duplicate: false, outcome: "IGNORED_UNKNOWN_REPOSITORY" };
    const matching = repositories.filter(
      (candidate) => candidate.fullName.toLowerCase() === payload.repository.full_name.toLowerCase()
    );
    if (matching.length === 0)
      throw new BadRequestException("GitHub repository identity mismatch.");
    const branch = payload.ref.slice("refs/heads/".length);
    const actionable = matching.filter((candidate) => candidate.defaultBranch === branch);
    if (actionable.length === 0)
      return { accepted: false, duplicate: false, outcome: "IGNORED_NON_DEFAULT_BRANCH" };

    let result;
    try {
      const occurredAt = payload.head_commit?.timestamp
        ? new Date(payload.head_commit.timestamp)
        : undefined;
      result = await this.repository.accept({
        deliveryId,
        eventType: "PUSH",
        providerRepositoryId: String(payload.repository.id),
        repositoryFullName: payload.repository.full_name,
        branch,
        targetCommitSha: payload.after.toLowerCase(),
        ...(occurredAt && !Number.isNaN(occurredAt.getTime()) ? { occurredAt } : {}),
        repositoryIds: actionable.map(({ id }) => id)
      });
    } catch (error) {
      if (error instanceof Error && error.message === "WEBHOOK_DELIVERY_CONFLICT")
        throw new BadRequestException(
          "GitHub delivery metadata conflicts with an existing delivery."
        );
      throw error;
    }
    this.logger.log(
      `github.webhook deliveryId=${deliveryId} providerRepositoryId=${payload.repository.id} eventType=PUSH branch=${branch} targetCommitSha=${payload.after.toLowerCase()} dispatches=${result.dispatchCount} duplicate=${result.duplicate}`
    );
    return {
      accepted: true,
      duplicate: result.duplicate,
      outcome: result.duplicate ? "DUPLICATE" : "ACCEPTED"
    };
  }
}

type PushPayload = {
  ref: string;
  after: string;
  deleted?: boolean;
  repository: { id: number | string; full_name: string };
  head_commit?: { timestamp?: string } | null;
};
function parsePushPayload(rawBody: Buffer): PushPayload {
  let value: unknown;
  try {
    value = JSON.parse(rawBody.toString("utf8"));
  } catch {
    throw new BadRequestException("Malformed GitHub webhook JSON.");
  }
  if (!value || typeof value !== "object")
    throw new BadRequestException("Malformed GitHub push payload.");
  const input = value as Record<string, unknown>;
  const repository = input.repository as Record<string, unknown> | undefined;
  if (
    typeof input.ref !== "string" ||
    !input.ref.startsWith("refs/heads/") ||
    typeof input.after !== "string" ||
    !SHA_PATTERN.test(input.after) ||
    !repository ||
    (typeof repository.id !== "number" && typeof repository.id !== "string") ||
    typeof repository.full_name !== "string" ||
    !/^[^/\s]+\/[^/\s]+$/.test(repository.full_name)
  )
    throw new BadRequestException("Malformed GitHub push payload.");
  return value as PushPayload;
}
