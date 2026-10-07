import type {
  DependencyIntelligenceHistoryResponse,
  DependencyIntelligenceResponse
} from "@ai-context/contracts";

import { apiRequestErrorFromResponse } from "@/lib/api-error";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

export type DependencyIntelligenceOptions = {
  page: number;
  pageSize: number;
  findingPage: number;
  findingPageSize: number;
};

async function request<T>(accessToken: string, path: string): Promise<T> {
  const response = await authenticatedFetch(path, {
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }
  });
  if (!response.ok) {
    throw await apiRequestErrorFromResponse(response, "Dependency Intelligence request failed");
  }
  return response.json() as Promise<T>;
}

function query(options: DependencyIntelligenceOptions) {
  return new URLSearchParams({
    page: String(options.page),
    pageSize: String(options.pageSize),
    findingPage: String(options.findingPage),
    findingPageSize: String(options.findingPageSize)
  });
}

export function getDependencyIntelligence(
  accessToken: string,
  repositoryId: string,
  options: DependencyIntelligenceOptions
): Promise<DependencyIntelligenceResponse> {
  return request(
    accessToken,
    `/repositories/${encodeURIComponent(repositoryId)}/dependency-intelligence?${query(options)}`
  );
}

export function getDependencyIntelligenceHistory(
  accessToken: string,
  repositoryId: string,
  options: DependencyIntelligenceOptions
): Promise<DependencyIntelligenceHistoryResponse> {
  return request(
    accessToken,
    `/repositories/${encodeURIComponent(repositoryId)}/dependency-intelligence/history?${query(options)}`
  );
}
