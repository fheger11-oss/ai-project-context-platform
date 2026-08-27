import type {
  GenerateProjectContextResponse,
  ProjectContextHistoryResponse,
  ProjectContextResponse
} from "@ai-context/contracts";

import { authenticatedFetch } from "@/lib/authenticated-fetch";

type RequestOptions = {
  accessToken: string;
  method?: "GET" | "POST";
};

export class ContextApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestOptions): Promise<T> {
  const response = await authenticatedFetch(path, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    throw new ContextApiRequestError(payload?.message ?? "Context request failed", response.status);
  }

  return response.json() as Promise<T>;
}

export function getLatestProjectContext(accessToken: string, analysisId: string) {
  return request<ProjectContextResponse>(
    `/analyses/${encodeURIComponent(analysisId)}/contexts/latest`,
    { accessToken }
  );
}

export function getProjectContextHistory(accessToken: string, analysisId: string) {
  return request<ProjectContextHistoryResponse>(
    `/analyses/${encodeURIComponent(analysisId)}/contexts`,
    { accessToken }
  );
}

export function getProjectContext(accessToken: string, contextId: string) {
  return request<ProjectContextResponse>(`/contexts/${encodeURIComponent(contextId)}`, {
    accessToken
  });
}

export function generateProjectContext(accessToken: string, analysisId: string) {
  return request<GenerateProjectContextResponse>(
    `/analyses/${encodeURIComponent(analysisId)}/contexts/generate`,
    {
      accessToken,
      method: "POST"
    }
  );
}

export type {
  ContextClaim,
  ContextConfidence,
  ContextEvidence,
  ProjectContextHistoryItem,
  ProjectContextHistoryResponse,
  ProjectContextResponse
} from "@ai-context/contracts";
