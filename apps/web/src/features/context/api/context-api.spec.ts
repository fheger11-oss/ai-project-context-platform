import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProjectContextHistoryResponse, ProjectContextResponse } from "@ai-context/contracts";

import {
  ContextApiRequestError,
  generateProjectContext,
  getLatestProjectContext,
  getProjectContext,
  getProjectContextHistory
} from "./context-api";

const projectContext: ProjectContextResponse = {
  id: "project_context_1",
  contextId: "context_1",
  analysisId: "analysis_1",
  scanId: "scan_1",
  repositoryId: "repository_1",
  commitSha: "abc123",
  contextVersion: "context-engine@5.7.1",
  generatedAt: "2026-08-17T10:00:00.000Z",
  createdAt: "2026-08-17T10:00:01.000Z",
  project: { claims: [] },
  technology: { claims: [] },
  structure: { claims: [] },
  architecture: { claims: [] },
  entryPoints: { claims: [] },
  testing: { claims: [] },
  infrastructure: { claims: [] },
  ambiguities: []
};

const history: ProjectContextHistoryResponse = {
  items: [projectContext]
};

function mockFetch(response: unknown, init: ResponseInit = { status: 200 }) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response), init));
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

describe("context-api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retrieves latest Context for an Analysis", async () => {
    const fetchMock = mockFetch(projectContext);

    await expect(getLatestProjectContext("access_token", "analysis/with space")).resolves.toEqual(
      projectContext
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/analyses/analysis%2Fwith%20space/contexts/latest",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer access_token" })
      })
    );
  });

  it("retrieves Context history", async () => {
    const fetchMock = mockFetch(history);

    await expect(getProjectContextHistory("access_token", "analysis_1")).resolves.toEqual(history);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/analyses/analysis_1/contexts",
      expect.any(Object)
    );
  });

  it("retrieves a specific persisted Context", async () => {
    const fetchMock = mockFetch(projectContext);

    await expect(getProjectContext("access_token", "context/with space")).resolves.toEqual(
      projectContext
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/contexts/context%2Fwith%20space",
      expect.any(Object)
    );
  });

  it("generates Context again through the authenticated API", async () => {
    const fetchMock = mockFetch(projectContext, { status: 201 });

    await expect(generateProjectContext("access_token", "analysis_1")).resolves.toEqual(
      projectContext
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/analyses/analysis_1/contexts/generate",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("returns safe Context API errors", async () => {
    mockFetch({ message: "Context was not found" }, { status: 404 });

    const request = getProjectContext("access_token", "missing");

    await expect(request).rejects.toBeInstanceOf(ContextApiRequestError);
    await expect(request).rejects.toMatchObject({
      status: 404,
      message: "Context was not found"
    });
  });
});
