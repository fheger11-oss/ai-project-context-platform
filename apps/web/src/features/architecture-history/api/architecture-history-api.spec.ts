import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  ArchitectureComparisonResponse,
  ArchitectureHistoryResponse
} from "@ai-context/contracts";

import {
  ApiRequestError,
  getArchitectureComparison,
  listArchitectureHistory
} from "@/features/architecture-history/api/architecture-history-api";

const historyResponse: ArchitectureHistoryResponse = { items: [] };
const comparisonResponse: ArchitectureComparisonResponse = {
  status: "NO_BASELINE",
  baseline: null,
  target: {
    historyId: "history_1",
    projectContextId: "context_1",
    analysisId: "analysis_1",
    scanId: "scan_1",
    commitSha: "1234567890abcdef1234567890abcdef12345678",
    promotedAt: "2026-09-30T12:00:00.000Z",
    generatedAt: "2026-09-30T11:00:00.000Z",
    contextVersion: "context-engine@5.7.1",
    analyzerVersion: "analysis-engine-4.10",
    hasPreviousSnapshot: false,
    adjacentCompatibility: "NO_BASELINE"
  }
};

function mockFetch(body: unknown, init: ResponseInit = { status: 200 }) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), init));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("architecture-history-api", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("requests repository-scoped history with an encoded ID", async () => {
    const fetchMock = mockFetch(historyResponse);

    await expect(listArchitectureHistory("token", "owner/repository 1")).resolves.toEqual(
      historyResponse
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/repositories/owner%2Frepository%201/architecture-history",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("requests an encoded adjacent comparison", async () => {
    const fetchMock = mockFetch(comparisonResponse);

    await expect(getArchitectureComparison("token", "repository/1", "history/1")).resolves.toEqual(
      comparisonResponse
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/repositories/repository%2F1/architecture-history/history%2F1/comparison",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("preserves shared API errors", async () => {
    mockFetch({ statusCode: 403, message: "Forbidden", error: "Forbidden" }, { status: 403 });

    const request = listArchitectureHistory("token", "repository_1");

    await expect(request).rejects.toBeInstanceOf(ApiRequestError);
    await expect(request).rejects.toMatchObject({ status: 403, message: "Forbidden" });
  });
});
