import type { ProjectTimelineResponse } from "@ai-context/contracts";

import { ApiRequestError, apiRequestErrorFromResponse } from "@/lib/api-error";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

export type ListProjectTimelineOptions = {
  page?: number;
  pageSize?: number;
};

export { ApiRequestError };

export async function listProjectTimeline(
  accessToken: string,
  repositoryId: string,
  options: ListProjectTimelineOptions = {}
): Promise<ProjectTimelineResponse> {
  const params = new URLSearchParams({
    page: String(options.page ?? 1),
    pageSize: String(options.pageSize ?? 20)
  });
  const response = await authenticatedFetch(
    `/repositories/${encodeURIComponent(repositoryId)}/timeline?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    }
  );

  if (!response.ok) {
    throw await apiRequestErrorFromResponse(response, "Project Timeline request failed");
  }

  return response.json() as Promise<ProjectTimelineResponse>;
}
