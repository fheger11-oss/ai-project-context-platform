import type {
  CreateProjectKnowledgeRequest,
  ProjectKnowledge,
  ProjectKnowledgeListResponse,
  ProjectKnowledgeStatus,
  UpdateProjectKnowledgeRequest
} from "@ai-context/contracts";
import { apiRequestErrorFromResponse } from "@/lib/api-error";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

async function request<T>(path: string, accessToken: string, init: RequestInit = {}): Promise<T> {
  const response = await authenticatedFetch(path, {
    ...init,
    method: init.method ?? "GET",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }
  });
  if (!response.ok)
    throw await apiRequestErrorFromResponse(response, "Project Knowledge request failed");
  return response.json() as Promise<T>;
}

export function listProjectKnowledge(
  accessToken: string,
  repositoryId: string,
  options: { page: number; pageSize: number; status?: ProjectKnowledgeStatus }
) {
  const params = new URLSearchParams({
    page: String(options.page),
    pageSize: String(options.pageSize)
  });
  if (options.status) params.set("status", options.status);
  return request<ProjectKnowledgeListResponse>(
    `/repositories/${encodeURIComponent(repositoryId)}/knowledge?${params}`,
    accessToken
  );
}

export function createProjectKnowledge(
  accessToken: string,
  repositoryId: string,
  input: CreateProjectKnowledgeRequest
) {
  return request<ProjectKnowledge>(
    `/repositories/${encodeURIComponent(repositoryId)}/knowledge`,
    accessToken,
    { method: "POST", body: JSON.stringify(input) }
  );
}

export function updateProjectKnowledge(
  accessToken: string,
  repositoryId: string,
  knowledgeId: string,
  input: UpdateProjectKnowledgeRequest
) {
  return request<ProjectKnowledge>(
    `/repositories/${encodeURIComponent(repositoryId)}/knowledge/${encodeURIComponent(knowledgeId)}`,
    accessToken,
    { method: "PATCH", body: JSON.stringify(input) }
  );
}
