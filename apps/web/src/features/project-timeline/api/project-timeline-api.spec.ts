import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProjectTimelineResponse } from "@ai-context/contracts";

import {
  ApiRequestError,
  listProjectTimeline
} from "@/features/project-timeline/api/project-timeline-api";

const response: ProjectTimelineResponse = {
  items: [],
  pagination: {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  }
};

function mockFetch(body: unknown, init: ResponseInit = { status: 200 }) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), init));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("project-timeline-api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses encoded repository scope and default pagination", async () => {
    const fetchMock = mockFetch(response);

    await expect(listProjectTimeline("access_token", "owner/repository 1")).resolves.toEqual(
      response
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/repositories/owner%2Frepository%201/timeline?page=1&pageSize=20",
      {
        method: "GET",
        headers: {
          Authorization: "Bearer access_token",
          "Content-Type": "application/json"
        }
      }
    );
  });

  it("serializes explicit page and pageSize with URLSearchParams", async () => {
    const fetchMock = mockFetch({
      ...response,
      pagination: { ...response.pagination, page: 2, pageSize: 10 }
    });

    await listProjectTimeline("access_token", "repository_1", { page: 2, pageSize: 10 });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/repositories/repository_1/timeline?page=2&pageSize=10",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("converts failed responses to the shared ApiRequestError", async () => {
    mockFetch({ statusCode: 403, message: "Forbidden", error: "Forbidden" }, { status: 403 });

    const request = listProjectTimeline("access_token", "repository_1");

    await expect(request).rejects.toBeInstanceOf(ApiRequestError);
    await expect(request).rejects.toMatchObject({ status: 403, message: "Forbidden" });
  });
});
