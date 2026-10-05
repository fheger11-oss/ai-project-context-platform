import { Injectable } from "@nestjs/common";
import { z } from "zod";

import type {
  CreateRepositoryWebhookInput,
  RepositoryWebhook,
  RepositoryWebhookProvider,
  RepositoryWebhookProviderAccess,
  UpdateRepositoryWebhookInput
} from "../application/contracts/repository-webhook-provider.contract.js";
import { RepositoryWebhookProviderError } from "../domain/repository-webhook-provider.error.js";

const GITHUB_API_BASE_URL = "https://api.github.com";
const GITHUB_REQUEST_TIMEOUT_MS = 10_000;

const githubWebhookSchema = z.object({
  id: z.number().int().positive(),
  active: z.boolean(),
  events: z.array(z.string()),
  config: z.object({
    url: z.string().url(),
    content_type: z.string(),
    insecure_ssl: z.union([z.string(), z.number()]).optional()
  })
});

type GitHubWebhookPayload = z.infer<typeof githubWebhookSchema>;

@Injectable()
export class GitHubRepositoryWebhookProvider implements RepositoryWebhookProvider {
  async create(input: CreateRepositoryWebhookInput): Promise<RepositoryWebhook> {
    const response = await this.request(this.hooksUrl(input), input.authorization, {
      method: "POST",
      body: JSON.stringify(this.writePayload(input))
    });

    return this.parseWebhook(await this.json(response));
  }

  async get(
    access: RepositoryWebhookProviderAccess,
    providerWebhookId: string
  ): Promise<RepositoryWebhook> {
    const response = await this.request(
      `${this.hooksUrl(access)}/${encodeURIComponent(providerWebhookId)}`,
      access.authorization
    );

    return this.parseWebhook(await this.json(response));
  }

  async list(access: RepositoryWebhookProviderAccess): Promise<RepositoryWebhook[]> {
    const hooks: RepositoryWebhook[] = [];

    for (let page = 1; ; page += 1) {
      const response = await this.request(
        `${this.hooksUrl(access)}?per_page=100&page=${page}`,
        access.authorization
      );
      const payload = await this.json(response);
      const parsed = z.array(githubWebhookSchema).safeParse(payload);

      if (!parsed.success) {
        throw new RepositoryWebhookProviderError("UNKNOWN");
      }

      hooks.push(...parsed.data.map((hook) => this.toWebhook(hook)));

      if (parsed.data.length < 100) {
        return hooks;
      }
    }
  }

  async update(input: UpdateRepositoryWebhookInput): Promise<RepositoryWebhook> {
    const response = await this.request(
      `${this.hooksUrl(input)}/${encodeURIComponent(input.providerWebhookId)}`,
      input.authorization,
      {
        method: "PATCH",
        body: JSON.stringify(this.writePayload(input))
      }
    );

    return this.parseWebhook(await this.json(response));
  }

  async delete(access: RepositoryWebhookProviderAccess, providerWebhookId: string): Promise<void> {
    await this.request(
      `${this.hooksUrl(access)}/${encodeURIComponent(providerWebhookId)}`,
      access.authorization,
      { method: "DELETE" }
    );
  }

  private hooksUrl(access: RepositoryWebhookProviderAccess): string {
    return `${GITHUB_API_BASE_URL}/repos/${encodeURIComponent(access.owner)}/${encodeURIComponent(access.name)}/hooks`;
  }

  private writePayload(input: CreateRepositoryWebhookInput | UpdateRepositoryWebhookInput) {
    return {
      name: "web",
      active: input.active,
      events: input.events,
      config: {
        url: input.callbackUrl,
        content_type: input.contentType,
        insecure_ssl: input.insecureSsl,
        secret: input.secret
      }
    };
  }

  private async request(
    url: string,
    authorization: unknown,
    init: Pick<RequestInit, "body" | "method"> = {}
  ): Promise<Response> {
    const bearerToken = this.bearerToken(authorization);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GITHUB_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${bearerToken}`,
          "Content-Type": "application/json",
          "User-Agent": "ai-project-context-platform",
          "X-GitHub-Api-Version": "2022-11-28"
        },
        signal: controller.signal
      });

      if (response.ok) {
        return response;
      }

      throw new RepositoryWebhookProviderError(this.failureFor(response));
    } catch (error) {
      if (error instanceof RepositoryWebhookProviderError) {
        throw error;
      }

      throw new RepositoryWebhookProviderError("PROVIDER_UNAVAILABLE");
    } finally {
      clearTimeout(timeout);
    }
  }

  private failureFor(response: Response) {
    if (response.status === 401) return "ACCESS_DENIED" as const;
    if (response.status === 404) return "NOT_FOUND" as const;
    if (response.status === 422) return "CONFIGURATION_INVALID" as const;
    if (response.status === 429 || response.headers.get("x-ratelimit-remaining") === "0") {
      return "PROVIDER_UNAVAILABLE" as const;
    }
    if (response.status === 403) return "AUTHORIZATION_REQUIRED" as const;
    if (response.status >= 500) return "PROVIDER_UNAVAILABLE" as const;
    return "UNKNOWN" as const;
  }

  private bearerToken(authorization: unknown): string {
    const parsed = z.object({ bearerToken: z.string().min(1) }).safeParse(authorization);

    if (!parsed.success) {
      throw new RepositoryWebhookProviderError("ACCESS_DENIED");
    }

    return parsed.data.bearerToken;
  }

  private async json(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      throw new RepositoryWebhookProviderError("UNKNOWN");
    }
  }

  private parseWebhook(payload: unknown): RepositoryWebhook {
    const parsed = githubWebhookSchema.safeParse(payload);

    if (!parsed.success) {
      throw new RepositoryWebhookProviderError("UNKNOWN");
    }

    return this.toWebhook(parsed.data);
  }

  private toWebhook(hook: GitHubWebhookPayload): RepositoryWebhook {
    return {
      providerWebhookId: String(hook.id),
      active: hook.active,
      callbackUrl: hook.config.url,
      contentType: hook.config.content_type,
      events: hook.events,
      insecureSsl: String(hook.config.insecure_ssl ?? "0")
    };
  }
}
