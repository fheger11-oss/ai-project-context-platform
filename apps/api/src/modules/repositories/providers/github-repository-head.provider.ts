import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { z } from "zod";

export type ResolveRepositoryHeadInput = {
  accessToken: string;
  name: string;
  owner: string;
  reference: string;
};

export type ResolvedRepositoryHead = {
  commitSha: string;
};

export interface RepositoryHeadProvider {
  resolveHead(input: ResolveRepositoryHeadInput): Promise<ResolvedRepositoryHead>;
}

const GITHUB_API_BASE_URL = "https://api.github.com";
const GITHUB_REQUEST_TIMEOUT_MS = 10_000;

const githubCommitSchema = z.object({
  sha: z.string().min(1)
});

@Injectable()
export class GitHubRepositoryHeadProvider implements RepositoryHeadProvider {
  async resolveHead(input: ResolveRepositoryHeadInput): Promise<ResolvedRepositoryHead> {
    const response = await this.request(this.repositoryCommitUrl(input), input.accessToken);
    const parsed = githubCommitSchema.safeParse(await response.json());

    if (!parsed.success) {
      throw new BadGatewayException("GitHub commit response could not be validated");
    }

    return { commitSha: parsed.data.sha };
  }

  private repositoryCommitUrl(input: ResolveRepositoryHeadInput): string {
    return `${GITHUB_API_BASE_URL}/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(
      input.name
    )}/commits/${encodeURIComponent(input.reference)}`;
  }

  private async request(url: string, accessToken: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GITHUB_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "ai-project-context-platform",
          "X-GitHub-Api-Version": "2022-11-28"
        },
        signal: controller.signal
      });

      if (response.status === 401 || response.status === 403) {
        if (response.headers.get("x-ratelimit-remaining") === "0") {
          throw new HttpException("GitHub rate limit exceeded", HttpStatus.TOO_MANY_REQUESTS);
        }

        throw new UnauthorizedException("GitHub access was rejected");
      }

      if (response.status === 404) {
        throw new BadGatewayException("GitHub repository HEAD could not be resolved");
      }

      if (!response.ok) {
        throw new BadGatewayException("GitHub repository HEAD could not be resolved");
      }

      return response;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof HttpException) {
        throw error;
      }

      throw new BadGatewayException("GitHub repository HEAD could not be resolved");
    } finally {
      clearTimeout(timeout);
    }
  }
}
