import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { z } from "zod";

import { RepositoryVisibility } from "../../../generated/prisma/enums.js";
import type { RepositoryAutomationCapability } from "../domain/repository-automation-status.js";

export type GitHubRepositoryMetadata = {
  githubId: string;
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  defaultBranch: string;
  visibility: RepositoryVisibility;
  language: string | null;
  stars: number;
  forks: number;
  isArchived: boolean;
  cloneUrl: string;
  htmlUrl: string;
  githubUpdatedAt: Date;
};

const GITHUB_REQUEST_TIMEOUT_MS = 10_000;
const GITHUB_MAX_REPOSITORY_PAGES = 20;

const githubRepositorySchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  full_name: z.string().min(1),
  owner: z.object({
    login: z.string().min(1)
  }),
  description: z.string().nullable(),
  default_branch: z.string().min(1),
  visibility: z.enum(["public", "private", "internal"]).optional(),
  private: z.boolean(),
  language: z.string().nullable(),
  stargazers_count: z.number().int().nonnegative(),
  forks_count: z.number().int().nonnegative(),
  archived: z.boolean(),
  clone_url: z.string().url(),
  html_url: z.string().url(),
  updated_at: z.string().datetime()
});

const githubRepositoryCapabilitySchema = z.object({
  id: z.number().int().positive(),
  permissions: z.object({
    admin: z.boolean(),
    maintain: z.boolean().optional(),
    pull: z.boolean().optional(),
    push: z.boolean().optional(),
    triage: z.boolean().optional()
  })
});

export type GitHubRepositoryCapabilityResult = {
  capability: RepositoryAutomationCapability;
  permissions: {
    admin: boolean;
    maintain: boolean | null;
    pull: boolean | null;
    push: boolean | null;
    triage: boolean | null;
  } | null;
};

type GitHubRepositoryApiResponse = z.infer<typeof githubRepositorySchema>;

@Injectable()
export class GitHubRepositoryProvider {
  async listRepositories(accessToken: string): Promise<GitHubRepositoryMetadata[]> {
    const repositories: GitHubRepositoryApiResponse[] = [];
    let nextUrl: string | null =
      "https://api.github.com/user/repos?affiliation=owner,collaborator,organization_member&per_page=100&sort=updated";

    let pageCount = 0;

    while (nextUrl) {
      const response = await this.request(nextUrl, accessToken);
      const page = z.array(githubRepositorySchema).safeParse(await response.json());

      if (!page.success) {
        throw new BadGatewayException("GitHub repository response could not be validated");
      }

      repositories.push(...page.data);
      nextUrl = this.getNextPageUrl(response.headers.get("link"));
      pageCount += 1;

      if (pageCount >= GITHUB_MAX_REPOSITORY_PAGES) {
        nextUrl = null;
      }
    }

    return repositories.map((repository) => this.toMetadata(repository));
  }

  async getRepositoryById(
    accessToken: string,
    githubId: string
  ): Promise<GitHubRepositoryMetadata | null> {
    const repositories = await this.listRepositories(accessToken);

    return repositories.find((repository) => repository.githubId === githubId) ?? null;
  }

  async checkWebhookManagementCapability(
    accessToken: string,
    repository: { githubId: string; name: string; owner: string }
  ): Promise<GitHubRepositoryCapabilityResult> {
    const url = `https://api.github.com/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GITHUB_REQUEST_TIMEOUT_MS);
    let response: Response;

    try {
      response = await this.fetch(url, accessToken, controller.signal);
    } catch {
      return { capability: "PROVIDER_UNAVAILABLE", permissions: null };
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 401) {
      return { capability: "PROVIDER_ACCESS_DENIED", permissions: null };
    }

    if (response.status === 404) {
      return { capability: "PROVIDER_REPOSITORY_NOT_FOUND", permissions: null };
    }

    if (response.status === 403) {
      if (response.headers.get("x-ratelimit-remaining") === "0") {
        return { capability: "PROVIDER_UNAVAILABLE", permissions: null };
      }

      return { capability: "PROVIDER_AUTHORIZATION_REQUIRED", permissions: null };
    }

    if (!response.ok) {
      return { capability: "PROVIDER_UNAVAILABLE", permissions: null };
    }

    let payload: unknown;

    try {
      payload = await response.json();
    } catch {
      return { capability: "PROVIDER_UNAVAILABLE", permissions: null };
    }

    const parsed = githubRepositoryCapabilitySchema.safeParse(payload);

    if (!parsed.success) {
      return { capability: "PROVIDER_UNAVAILABLE", permissions: null };
    }

    if (String(parsed.data.id) !== repository.githubId) {
      return { capability: "PROVIDER_REPOSITORY_NOT_FOUND", permissions: null };
    }

    const permissions = {
      admin: parsed.data.permissions.admin,
      maintain: parsed.data.permissions.maintain ?? null,
      pull: parsed.data.permissions.pull ?? null,
      push: parsed.data.permissions.push ?? null,
      triage: parsed.data.permissions.triage ?? null
    };

    return {
      capability: permissions.admin ? "CAN_MANAGE_WEBHOOK" : "CANNOT_MANAGE_WEBHOOK",
      permissions
    };
  }

  private async request(url: string, accessToken: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GITHUB_REQUEST_TIMEOUT_MS);

    try {
      const response = await this.fetch(url, accessToken, controller.signal);

      if (response.status === 401 || response.status === 403) {
        if (response.headers.get("x-ratelimit-remaining") === "0") {
          throw new HttpException("GitHub rate limit exceeded", HttpStatus.TOO_MANY_REQUESTS);
        }

        throw new UnauthorizedException("GitHub access was rejected");
      }

      if (!response.ok) {
        throw new BadGatewayException("GitHub repositories could not be retrieved");
      }

      return response;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof HttpException) {
        throw error;
      }

      throw new BadGatewayException("GitHub repositories could not be retrieved");
    } finally {
      clearTimeout(timeout);
    }
  }

  private fetch(url: string, accessToken: string, signal?: AbortSignal) {
    return fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "ai-project-context-platform",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      ...(signal ? { signal } : {})
    });
  }

  private getNextPageUrl(linkHeader: string | null) {
    if (!linkHeader) {
      return null;
    }

    const nextLink = linkHeader
      .split(",")
      .map((link) => link.trim())
      .find((link) => link.endsWith('rel="next"'));

    return nextLink?.match(/<([^>]+)>/)?.[1] ?? null;
  }

  private toMetadata(repository: GitHubRepositoryApiResponse): GitHubRepositoryMetadata {
    return {
      githubId: String(repository.id),
      name: repository.name,
      fullName: repository.full_name,
      owner: repository.owner.login,
      description: repository.description,
      defaultBranch: repository.default_branch,
      visibility: this.toVisibility(repository),
      language: repository.language,
      stars: repository.stargazers_count,
      forks: repository.forks_count,
      isArchived: repository.archived,
      cloneUrl: repository.clone_url,
      htmlUrl: repository.html_url,
      githubUpdatedAt: new Date(repository.updated_at)
    };
  }

  private toVisibility(repository: GitHubRepositoryApiResponse) {
    if (repository.visibility === "internal") {
      return RepositoryVisibility.INTERNAL;
    }

    return repository.private ? RepositoryVisibility.PRIVATE : RepositoryVisibility.PUBLIC;
  }
}
