import type { AnalysisResultResponse, CreateAnalysisRequest } from "@ai-context/contracts";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";

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

  const response = await fetch(`${API_URL}${path}`, init);

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

export type { AnalysisResultResponse, CreateAnalysisRequest };
