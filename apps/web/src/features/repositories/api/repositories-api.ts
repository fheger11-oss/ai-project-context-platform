import type {
  AvailableGitHubRepository,
  ListAvailableGitHubRepositoriesResponse,
  ListRepositoriesResponse,
  RepositorySummary
} from "@ai-context/contracts";

import { authenticatedFetch } from "@/lib/authenticated-fetch";

type RequestOptions = {
  accessToken: string;
  body?: unknown;
  method?: "DELETE" | "GET" | "POST";
};

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestOptions): Promise<T> {
  const init: RequestInit = {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      "Content-Type": "application/json"
    }
  };

  if (options.body) {
    init.body = JSON.stringify(options.body);
  }

  const response = await authenticatedFetch(path, init);

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    throw new ApiRequestError(payload?.message ?? "Request failed", response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function listRepositories(accessToken: string) {
  return request<ListRepositoriesResponse>("/repositories", { accessToken });
}

export function getRepository(accessToken: string, id: string) {
  return request<RepositorySummary>(`/repositories/${id}`, { accessToken });
}

export function listAvailableGitHubRepositories(accessToken: string) {
  return request<ListAvailableGitHubRepositoriesResponse>("/repositories/github/list", {
    accessToken
  });
}

export function connectRepository(accessToken: string, githubId: string) {
  return request<RepositorySummary>("/repositories/connect", {
    accessToken,
    method: "POST",
    body: {
      githubId
    }
  });
}

export function disconnectRepository(accessToken: string, repositoryId: string) {
  return request<void>(`/repositories/${repositoryId}`, {
    accessToken,
    method: "DELETE"
  });
}

export function syncRepository(accessToken: string, repositoryId: string) {
  return request<RepositorySummary>(`/repositories/${repositoryId}/sync`, {
    accessToken,
    method: "POST"
  });
}

export type { AvailableGitHubRepository, RepositorySummary };
