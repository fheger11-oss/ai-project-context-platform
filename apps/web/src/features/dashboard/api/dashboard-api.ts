import type { DashboardProjectsResponse } from "@ai-context/contracts";

import { authenticatedFetch } from "@/lib/authenticated-fetch";

type RequestOptions = {
  accessToken: string;
};

export class DashboardApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestOptions): Promise<T> {
  const response = await authenticatedFetch(path, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    throw new DashboardApiRequestError(
      payload?.message ?? "Dashboard request failed",
      response.status
    );
  }

  return response.json() as Promise<T>;
}

export function listDashboardProjects(accessToken: string): Promise<DashboardProjectsResponse> {
  return request<DashboardProjectsResponse>("/dashboard/projects", { accessToken });
}

export type { DashboardProjectsResponse };
