import type {
  CreateProjectDecisionRequest,
  ProjectDecision,
  ProjectDecisionListResponse,
  ProjectDecisionStatus,
  UpdateProjectDecisionRequest
} from "@ai-context/contracts";

import { ApiRequestError, apiRequestErrorFromResponse } from "@/lib/api-error";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

type RequestOptions = {
  accessToken: string;
  body?: unknown;
  method?: "GET" | "PATCH" | "POST";
};

export type ListProjectDecisionsOptions = {
  page: number;
  pageSize: number;
  status?: ProjectDecisionStatus;
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

  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  const response = await authenticatedFetch(path, init);

  if (!response.ok) {
    throw await apiRequestErrorFromResponse(response, "ProjectDecision request failed");
  }

  return response.json() as Promise<T>;
}

export function listProjectDecisions(
  accessToken: string,
  repositoryId: string,
  options: ListProjectDecisionsOptions
) {
  const params = new URLSearchParams({
    page: String(options.page),
    pageSize: String(options.pageSize)
  });

  if (options.status) {
    params.set("status", options.status);
  }

  return request<ProjectDecisionListResponse>(
    `/repositories/${encodeURIComponent(repositoryId)}/decisions?${params.toString()}`,
    { accessToken }
  );
}

export function createProjectDecision(
  accessToken: string,
  repositoryId: string,
  input: CreateProjectDecisionRequest
) {
  return request<ProjectDecision>(`/repositories/${encodeURIComponent(repositoryId)}/decisions`, {
    accessToken,
    body: input,
    method: "POST"
  });
}

export function getProjectDecision(accessToken: string, repositoryId: string, decisionId: string) {
  return request<ProjectDecision>(
    `/repositories/${encodeURIComponent(repositoryId)}/decisions/${encodeURIComponent(decisionId)}`,
    { accessToken }
  );
}

export function updateProjectDecision(
  accessToken: string,
  repositoryId: string,
  decisionId: string,
  input: UpdateProjectDecisionRequest
) {
  return request<ProjectDecision>(
    `/repositories/${encodeURIComponent(repositoryId)}/decisions/${encodeURIComponent(decisionId)}`,
    { accessToken, body: input, method: "PATCH" }
  );
}
