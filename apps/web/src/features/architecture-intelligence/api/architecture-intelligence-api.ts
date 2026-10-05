import type {
  ArchitectureFindingLifecycle,
  ArchitectureIntelligenceConfidence,
  ArchitectureIntelligenceHistoryResponse,
  ArchitectureIntelligenceResponse
} from "@ai-context/contracts";

import { apiRequestErrorFromResponse } from "@/lib/api-error";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

export type ArchitectureIntelligenceOptions = {
  page: number;
  pageSize: number;
  modulePage: number;
  modulePageSize: number;
  ruleId?: string;
  confidence?: ArchitectureIntelligenceConfidence;
  lifecycle?: ArchitectureFindingLifecycle;
};

async function request<T>(accessToken: string, path: string): Promise<T> {
  const response = await authenticatedFetch(path, {
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }
  });
  if (!response.ok) {
    throw await apiRequestErrorFromResponse(response, "Architecture Intelligence request failed");
  }
  return response.json() as Promise<T>;
}

export function getArchitectureIntelligence(
  accessToken: string,
  repositoryId: string,
  options: ArchitectureIntelligenceOptions
): Promise<ArchitectureIntelligenceResponse> {
  const query = new URLSearchParams({
    page: String(options.page),
    pageSize: String(options.pageSize),
    modulePage: String(options.modulePage),
    modulePageSize: String(options.modulePageSize)
  });
  if (options.ruleId) query.set("ruleId", options.ruleId);
  if (options.confidence) query.set("confidence", options.confidence);
  if (options.lifecycle) query.set("lifecycle", options.lifecycle);
  return request(
    accessToken,
    `/repositories/${encodeURIComponent(repositoryId)}/architecture-intelligence?${query}`
  );
}

export function getArchitectureIntelligenceHistory(
  accessToken: string,
  repositoryId: string,
  page: number,
  pageSize: number
): Promise<ArchitectureIntelligenceHistoryResponse> {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return request(
    accessToken,
    `/repositories/${encodeURIComponent(repositoryId)}/architecture-intelligence/history?${query}`
  );
}
