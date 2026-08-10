import type { ScanHistoryResponse, ScanSnapshot, StartScanRequest } from "@ai-context/contracts";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";

type RequestOptions = {
  accessToken: string;
  body?: unknown;
  method?: "GET" | "POST";
};

export class ScanApiRequestError extends Error {
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

    throw new ScanApiRequestError(payload?.message ?? "Scan request failed", response.status);
  }

  return response.json() as Promise<T>;
}

export function startScan(accessToken: string, repositoryId: string, reference?: string) {
  const body: StartScanRequest = {
    repositoryId,
    ...(reference ? { reference } : {})
  };

  return request<ScanSnapshot>("/scans/start", {
    accessToken,
    method: "POST",
    body
  });
}

export function getScanHistory(
  accessToken: string,
  repositoryId: string,
  page?: number,
  pageSize?: number
) {
  const params = new URLSearchParams();

  if (page !== undefined) {
    params.set("page", String(page));
  }

  if (pageSize !== undefined) {
    params.set("pageSize", String(pageSize));
  }

  const queryString = params.toString();
  const path = `/scans/repositories/${encodeURIComponent(repositoryId)}/history${
    queryString ? `?${queryString}` : ""
  }`;

  return request<ScanHistoryResponse>(path, { accessToken });
}

export type {
  ScanHistoryResponse,
  ScanSnapshot,
  ScanStatus,
  StartScanRequest
} from "@ai-context/contracts";
