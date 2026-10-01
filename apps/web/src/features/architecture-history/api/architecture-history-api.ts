import type {
  ArchitectureComparisonResponse,
  ArchitectureHistoryResponse
} from "@ai-context/contracts";

import { ApiRequestError, apiRequestErrorFromResponse } from "@/lib/api-error";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

export { ApiRequestError };

async function architectureHistoryRequest<T>(
  accessToken: string,
  path: string,
  failureMessage: string
): Promise<T> {
  const response = await authenticatedFetch(path, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    throw await apiRequestErrorFromResponse(response, failureMessage);
  }

  return response.json() as Promise<T>;
}

export function listArchitectureHistory(
  accessToken: string,
  repositoryId: string
): Promise<ArchitectureHistoryResponse> {
  return architectureHistoryRequest(
    accessToken,
    `/repositories/${encodeURIComponent(repositoryId)}/architecture-history`,
    "Architecture History request failed"
  );
}

export function getArchitectureComparison(
  accessToken: string,
  repositoryId: string,
  historyId: string
): Promise<ArchitectureComparisonResponse> {
  return architectureHistoryRequest(
    accessToken,
    `/repositories/${encodeURIComponent(repositoryId)}/architecture-history/${encodeURIComponent(historyId)}/comparison`,
    "Architecture comparison request failed"
  );
}
