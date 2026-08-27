import { afterEach, describe, expect, it, vi } from "vitest";
import type { DashboardProjectsResponse } from "@ai-context/contracts";

import {
  DashboardApiRequestError,
  listDashboardProjects
} from "@/features/dashboard/api/dashboard-api";

const response: DashboardProjectsResponse = {
  projects: []
};

function mockFetch(body: unknown, init: ResponseInit = { status: 200 }) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), init));
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

describe("dashboard-api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads dashboard projects through the authenticated Dashboard API", async () => {
    const fetchMock = mockFetch(response);

    const result = await listDashboardProjects("access_token");

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/api/v1/dashboard/projects", {
      method: "GET",
      headers: {
        Authorization: "Bearer access_token",
        "Content-Type": "application/json"
      }
    });
    expect(result).toEqual(response);
  });

  it("propagates Dashboard API errors", async () => {
    mockFetch({ message: "Authentication required" }, { status: 401 });
    const request = listDashboardProjects("access_token");

    await expect(request).rejects.toBeInstanceOf(DashboardApiRequestError);
    await expect(request).rejects.toMatchObject({
      status: 401,
      message: "Authentication required"
    });
  });
});
