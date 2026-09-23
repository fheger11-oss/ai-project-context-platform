import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  ProjectContextResponse,
  RepositoryCurrentUpdateResponse,
  RepositoryStateSummary,
  RepositoryUpdateHistoryResponse,
  RepositoryUpdateResponse
} from "@ai-context/contracts";

import {
  ApiRequestError,
  getCurrentRepositoryUpdate,
  getCurrentProjectContext,
  getRepositoryState,
  getRepositoryUpdateHistory,
  refreshRepositoryState,
  runRepositoryUpdate
} from "@/features/repositories/api/repositories-api";

const state: RepositoryStateSummary = {
  repositoryId: "repository_1",
  freshnessStatus: "UNKNOWN",
  remoteHeadCommitSha: null,
  remoteHeadCheckedAt: null,
  lastScannedCommitSha: "commit-scan",
  lastAnalyzedCommitSha: "commit-analysis",
  currentProjectContextId: "context_1",
  currentContextCommitSha: "commit-context",
  lastUpdateStatus: null
};

const context: ProjectContextResponse = {
  id: "context_1",
  contextId: "ctxaro_context_1",
  analysisId: "analysis_1",
  scanId: "scan_1",
  repositoryId: "repository_1",
  commitSha: "commit-context",
  contextVersion: "context-engine@5.7.1",
  generatedAt: "2026-09-22T12:00:00.000Z",
  createdAt: "2026-09-22T12:00:01.000Z",
  project: { claims: [] },
  technology: { claims: [] },
  structure: { claims: [] },
  architecture: { claims: [] },
  entryPoints: { claims: [] },
  testing: { claims: [] },
  infrastructure: { claims: [] },
  ambiguities: []
};

const updateResponse: RepositoryUpdateResponse = {
  noop: false,
  updateId: "update_1",
  status: "COMPLETED",
  triggerType: "MANUAL",
  baseCommitSha: "commit-context",
  targetCommitSha: "commit-next",
  scanId: "scan_2",
  analysisId: "analysis_2",
  projectContextId: "context_2",
  freshnessStatus: "FRESH"
};

const updateSummary: RepositoryUpdateHistoryResponse["items"][number] = {
  id: "update_1",
  repositoryId: "repository_1",
  triggerType: "MANUAL",
  status: "FAILED",
  baseCommitSha: "commit-context",
  targetCommitSha: "commit-next",
  startedAt: "2026-09-22T12:00:00.000Z",
  completedAt: null,
  failedAt: "2026-09-22T12:02:00.000Z",
  failureReason: "SCAN_FAILED",
  scanId: null,
  analysisId: null,
  projectContextId: null,
  createdAt: "2026-09-22T11:59:59.000Z",
  updatedAt: "2026-09-22T12:02:00.000Z"
};

function mockFetch(body: unknown, init: ResponseInit = { status: 200 }) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), init));
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

describe("repositories-api RepositoryState endpoints", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads repository state through the authenticated Repository API", async () => {
    const fetchMock = mockFetch(state);

    const result = await getRepositoryState("access_token", "repository_1");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/repositories/repository_1/state",
      {
        method: "GET",
        headers: {
          Authorization: "Bearer access_token",
          "Content-Type": "application/json"
        }
      }
    );
    expect(result).toEqual(state);
  });

  it("loads the current ProjectContext through the repository current-context API", async () => {
    const fetchMock = mockFetch(context);

    const result = await getCurrentProjectContext("access_token", "repository_1");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/repositories/repository_1/current-context",
      {
        method: "GET",
        headers: {
          Authorization: "Bearer access_token",
          "Content-Type": "application/json"
        }
      }
    );
    expect(result).toEqual(context);
  });

  it("refreshes repository state through the explicit refresh endpoint", async () => {
    const fetchMock = mockFetch({
      ...state,
      freshnessStatus: "FRESH",
      remoteHeadCommitSha: "commit-context",
      remoteHeadCheckedAt: "2026-09-22T12:30:00.000Z"
    } satisfies RepositoryStateSummary);

    const result = await refreshRepositoryState("access_token", "repository_1");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/repositories/repository_1/state/refresh",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer access_token",
          "Content-Type": "application/json"
        }
      }
    );
    expect(result.freshnessStatus).toBe("FRESH");
  });

  it("runs a manual repository update through the update endpoint", async () => {
    const fetchMock = mockFetch(updateResponse);

    const result = await runRepositoryUpdate("access_token", "repository_1");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/repositories/repository_1/updates",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer access_token",
          "Content-Type": "application/json"
        }
      }
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty("body");
    expect(result).toEqual(updateResponse);
  });

  it("loads repository update history with pagination", async () => {
    const history: RepositoryUpdateHistoryResponse = {
      items: [updateSummary],
      pagination: {
        page: 2,
        pageSize: 5,
        total: 8,
        hasNextPage: true
      }
    };
    const fetchMock = mockFetch(history);

    const result = await getRepositoryUpdateHistory("access_token", "repository_1", 2, 5);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/repositories/repository_1/updates?page=2&pageSize=5",
      {
        method: "GET",
        headers: {
          Authorization: "Bearer access_token",
          "Content-Type": "application/json"
        }
      }
    );
    expect(result).toEqual(history);
  });

  it("loads the current repository update status", async () => {
    const current: RepositoryCurrentUpdateResponse = {
      update: { ...updateSummary, status: "RUNNING", failedAt: null, failureReason: null }
    };
    const fetchMock = mockFetch(current);

    const result = await getCurrentRepositoryUpdate("access_token", "repository_1");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/repositories/repository_1/updates/current",
      {
        method: "GET",
        headers: {
          Authorization: "Bearer access_token",
          "Content-Type": "application/json"
        }
      }
    );
    expect(result.update?.status).toBe("RUNNING");
  });

  it("propagates repository state API errors", async () => {
    mockFetch({ message: "Repository was not found" }, { status: 404 });
    const request = getRepositoryState("access_token", "repository_2");

    await expect(request).rejects.toBeInstanceOf(ApiRequestError);
    await expect(request).rejects.toMatchObject({
      status: 404,
      message: "Repository was not found"
    });
  });
});
