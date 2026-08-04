import { BadGatewayException, Injectable, UnauthorizedException } from "@nestjs/common";

import { RepositoryVisibility } from "../../../generated/prisma/enums.js";

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

type GitHubRepositoryApiResponse = {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
  description: string | null;
  default_branch: string;
  visibility?: "public" | "private" | "internal";
  private: boolean;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  archived: boolean;
  clone_url: string;
  html_url: string;
  updated_at: string;
};

@Injectable()
export class GitHubRepositoryProvider {
  async listRepositories(accessToken: string): Promise<GitHubRepositoryMetadata[]> {
    const repositories: GitHubRepositoryApiResponse[] = [];
    let nextUrl: string | null =
      "https://api.github.com/user/repos?affiliation=owner,collaborator,organization_member&per_page=100&sort=updated";

    while (nextUrl) {
      const response = await this.request(nextUrl, accessToken);
      const page = (await response.json()) as GitHubRepositoryApiResponse[];

      repositories.push(...page);
      nextUrl = this.getNextPageUrl(response.headers.get("link"));
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

  private async request(url: string, accessToken: string) {
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "ai-project-context-platform",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });

    if (response.status === 401 || response.status === 403) {
      throw new UnauthorizedException("GitHub access was rejected");
    }

    if (!response.ok) {
      throw new BadGatewayException("GitHub repositories could not be retrieved");
    }

    return response;
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
