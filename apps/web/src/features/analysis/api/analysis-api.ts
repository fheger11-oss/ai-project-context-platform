import type {
  AnalysisHistoryResponse,
  AnalysisResultResponse,
  CreateAnalysisRequest
} from "@ai-context/contracts";

import { authenticatedFetch } from "@/lib/authenticated-fetch";

type RequestOptions = {
  accessToken: string;
  body?: unknown;
  method?: "GET" | "POST";
};

export class AnalysisApiRequestError extends Error {
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

    throw new AnalysisApiRequestError(
      payload?.message ?? "Analysis request failed",
      response.status
    );
  }

  return response.json() as Promise<T>;
}

export function startAnalysis(accessToken: string, scanId: string) {
  const body: CreateAnalysisRequest = {
    scanId
  };

  return request<AnalysisResultResponse>("/analyses", {
    accessToken,
    method: "POST",
    body
  });
}

export function getAnalysisResult(accessToken: string, analysisId: string) {
  return request<AnalysisResultResponse>(`/analyses/${encodeURIComponent(analysisId)}`, {
    accessToken
  });
}

export function getAnalysisHistory(accessToken: string, scanId: string) {
  return request<AnalysisHistoryResponse>(`/scans/${encodeURIComponent(scanId)}/analyses`, {
    accessToken
  });
}

export type { AnalysisHistoryItem, AnalysisHistoryResponse } from "@ai-context/contracts";
export type { AnalysisResultResponse, CreateAnalysisRequest };
