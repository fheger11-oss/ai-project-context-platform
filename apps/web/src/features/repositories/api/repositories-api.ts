import type {
  AvailableGitHubRepository,
  ListAvailableGitHubRepositoriesResponse,
  ListRepositoriesResponse,
  ProjectContextResponse,
  RepositoryCurrentUpdateResponse,
  RepositoryUpdateHistoryResponse,
  RepositoryUpdateResponse,
  RepositoryStateSummary,
  RepositorySummary
} from "@ai-context/contracts";

import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { ApiRequestError, apiRequestErrorFromResponse } from "@/lib/api-error";

type RequestOptions = {
  accessToken: string;
  body?: unknown;
  method?: "DELETE" | "GET" | "POST";
};

export { ApiRequestError };

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
    throw await apiRequestErrorFromResponse(response, "Request failed");
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

export function getRepositoryState(accessToken: string, id: string) {
  return request<RepositoryStateSummary>(`/repositories/${id}/state`, { accessToken });
}

export function refreshRepositoryState(accessToken: string, id: string) {
  return request<RepositoryStateSummary>(`/repositories/${id}/state/refresh`, {
    accessToken,
    method: "POST"
  });
}

export function getCurrentProjectContext(accessToken: string, id: string) {
  return request<ProjectContextResponse>(`/repositories/${id}/current-context`, { accessToken });
}

export function runRepositoryUpdate(accessToken: string, id: string) {
  return request<RepositoryUpdateResponse>(`/repositories/${id}/updates`, {
    accessToken,
    method: "POST"
  });
}

export function getRepositoryUpdateHistory(
  accessToken: string,
  id: string,
  page = 1,
  pageSize = 5
) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize)
  });

  return request<RepositoryUpdateHistoryResponse>(`/repositories/${id}/updates?${params}`, {
    accessToken
  });
}

export function getCurrentRepositoryUpdate(accessToken: string, id: string) {
  return request<RepositoryCurrentUpdateResponse>(`/repositories/${id}/updates/current`, {
    accessToken
  });
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

export type {
  AvailableGitHubRepository,
  ProjectContextResponse,
  RepositoryCurrentUpdateResponse,
  RepositoryUpdateHistoryResponse,
  RepositoryUpdateResponse,
  RepositoryStateSummary,
  RepositorySummary
};
