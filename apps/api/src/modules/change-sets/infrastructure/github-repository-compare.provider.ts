import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { z } from "zod";

import type {
  RepositoryCompareAccess,
  RepositoryCompareProvider,
  RepositoryComparison
} from "../domain/contracts/repository-compare-provider.contract.js";
import { ComparisonStatus, FileChangeType, type ChangedFile } from "../domain/change-set.js";

const GITHUB_API_BASE_URL = "https://api.github.com";
const GITHUB_REQUEST_TIMEOUT_MS = 10_000;

const githubCompareFileSchema = z.object({
  filename: z.string().min(1),
  status: z.enum(["added", "modified", "removed", "renamed", "copied", "changed"]),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
  previous_filename: z.string().min(1).optional()
});

const githubCompareSchema = z.object({
  status: z.enum(["identical", "ahead", "behind", "diverged"]),
  ahead_by: z.number().int().nonnegative(),
  behind_by: z.number().int().nonnegative(),
  base_commit: z.object({ sha: z.string().min(1) }),
  merge_base_commit: z.object({ sha: z.string().min(1) }),
  files: z.array(githubCompareFileSchema).optional()
});

type GitHubCompareFile = z.infer<typeof githubCompareFileSchema>;

@Injectable()
export class GitHubRepositoryCompareProvider implements RepositoryCompareProvider {
  async compare(
    repository: RepositoryCompareAccess,
    baseCommitSha: string,
    targetCommitSha: string
  ): Promise<RepositoryComparison> {
    const accessToken = this.bearerToken(repository.authorization);
    const response = await this.request(
      this.compareUrl(repository, baseCommitSha, targetCommitSha),
      accessToken
    );
    let payload: unknown;

    try {
      payload = await response.json();
    } catch {
      throw new BadGatewayException("GitHub compare response could not be validated");
    }

    const parsed = githubCompareSchema.safeParse(payload);

    if (!parsed.success) {
      throw new BadGatewayException("GitHub compare response could not be validated");
    }

    const files = parsed.data.files ?? [];

    // GitHub returns changed files only on the first compare page and caps that list at 300.
    // Commit pagination therefore cannot recover a truncated file list; fail instead of
    // producing a partial ChangeSet.
    if (files.length >= 300) {
      throw new BadGatewayException("GitHub compare response did not contain all changed files");
    }

    return {
      baseCommitSha,
      targetCommitSha,
      comparisonStatus: this.comparisonStatus(parsed.data.status),
      aheadBy: parsed.data.ahead_by,
      behindBy: parsed.data.behind_by,
      changedFileCount: files.length,
      files: files.map((file) => this.changedFile(file))
    };
  }

  private compareUrl(
    repository: RepositoryCompareAccess,
    baseCommitSha: string,
    targetCommitSha: string
  ): string {
    return `${GITHUB_API_BASE_URL}/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(
      repository.name
    )}/compare/${encodeURIComponent(baseCommitSha)}...${encodeURIComponent(targetCommitSha)}`;
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

      if (response.status === 404 || response.status === 422) {
        throw new BadGatewayException("GitHub comparison could not be resolved");
      }

      if (!response.ok) {
        throw new BadGatewayException("GitHub comparison could not be resolved");
      }

      return response;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new BadGatewayException("GitHub comparison could not be resolved");
    } finally {
      clearTimeout(timeout);
    }
  }

  private bearerToken(authorization: unknown): string {
    const parsed = z.object({ bearerToken: z.string().min(1) }).safeParse(authorization);

    if (!parsed.success) {
      throw new UnauthorizedException("GitHub access was rejected");
    }

    return parsed.data.bearerToken;
  }

  private comparisonStatus(status: "identical" | "ahead" | "behind" | "diverged") {
    return {
      identical: ComparisonStatus.IDENTICAL,
      ahead: ComparisonStatus.AHEAD,
      behind: ComparisonStatus.BEHIND,
      diverged: ComparisonStatus.DIVERGED
    }[status];
  }

  private changedFile(file: GitHubCompareFile): ChangedFile {
    const type = {
      added: FileChangeType.ADDED,
      modified: FileChangeType.MODIFIED,
      changed: FileChangeType.MODIFIED,
      removed: FileChangeType.DELETED,
      renamed: FileChangeType.RENAMED,
      copied: FileChangeType.COPIED
    }[file.status];

    return {
      path: file.filename,
      type,
      additions: file.additions,
      deletions: file.deletions,
      ...(file.previous_filename ? { previousPath: file.previous_filename } : {})
    };
  }
}
