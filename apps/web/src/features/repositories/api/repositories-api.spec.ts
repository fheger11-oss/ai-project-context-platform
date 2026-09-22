import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProjectContextResponse, RepositoryStateSummary } from "@ai-context/contracts";

import {
  ApiRequestError,
  getCurrentProjectContext,
  getRepositoryState
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
