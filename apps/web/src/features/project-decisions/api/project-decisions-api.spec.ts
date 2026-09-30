import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProjectDecision, ProjectDecisionListResponse } from "@ai-context/contracts";

import {
  ApiRequestError,
  createProjectDecision,
  getProjectDecision,
  listProjectDecisions,
  updateProjectDecision
} from "@/features/project-decisions/api/project-decisions-api";

const decision: ProjectDecision = {
  id: "decision_1",
  repositoryId: "repository_1",
  title: "Database",
  decision: "Use managed Postgres.",
  rationale: "Reduce operational overhead.",
  affectedArea: "Infrastructure",
  status: "ACTIVE",
  decidedAt: "2026-09-30T10:30:00.000Z",
  sourceProjectContextId: null,
  sourceRepositoryUpdateId: null,
  sourceCommitSha: null,
  createdAt: "2026-09-30T10:31:00.000Z",
  updatedAt: "2026-09-30T10:31:00.000Z"
};

function mockFetch(body: unknown, init: ResponseInit = { status: 200 }) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), init));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("project-decisions-api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists repository decisions with encoded scope, pagination, and status", async () => {
    const response: ProjectDecisionListResponse = {
      items: [decision],
      pagination: { page: 2, pageSize: 10, total: 11, hasNextPage: false }
    };
    const fetchMock = mockFetch(response);

    await expect(
      listProjectDecisions("access_token", "owner/repository 1", {
        page: 2,
        pageSize: 10,
        status: "ACTIVE"
      })
    ).resolves.toEqual(response);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/repositories/owner%2Frepository%201/decisions?page=2&pageSize=10&status=ACTIVE",
      {
        method: "GET",
        headers: {
          Authorization: "Bearer access_token",
          "Content-Type": "application/json"
        }
      }
    );
  });

  it("creates a decision without body-owned repository or status fields", async () => {
    const fetchMock = mockFetch(decision, { status: 201 });
    const input = {
      title: "Database",
      decision: "Use managed Postgres.",
      rationale: "Reduce operational overhead.",
      affectedArea: "Infrastructure",
      decidedAt: "2026-09-30T10:30:00.000Z"
    };

    await expect(createProjectDecision("access_token", "repository_1", input)).resolves.toEqual(
      decision
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/repositories/repository_1/decisions",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer access_token",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      }
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).not.toHaveProperty(
      "repositoryId"
    );
  });

  it("gets one decision using encoded repository and decision IDs", async () => {
    const fetchMock = mockFetch(decision);

    await getProjectDecision("access_token", "repository/a", "decision/1");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/repositories/repository%2Fa/decisions/decision%2F1",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("patches the mutable decision fields including decidedAt", async () => {
    const updated = { ...decision, decidedAt: "2026-09-29T12:00:00.000Z" };
    const fetchMock = mockFetch(updated);
    const input = {
      title: "Production database",
      decidedAt: "2026-09-29T12:00:00.000Z"
    };

    await expect(
      updateProjectDecision("access_token", "repository_1", "decision_1", input)
    ).resolves.toEqual(updated);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/repositories/repository_1/decisions/decision_1",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify(input) })
    );
  });

  it("preserves the shared ApiRequestError status and payload", async () => {
    mockFetch(
      {
        statusCode: 409,
        message:
          "ProjectDecision changed while the update was being applied. Reload and try again.",
        error: "Conflict"
      },
      { status: 409 }
    );

    const request = updateProjectDecision("access_token", "repository_1", "decision_1", {
      status: "ARCHIVED"
    });

    await expect(request).rejects.toBeInstanceOf(ApiRequestError);
    await expect(request).rejects.toMatchObject({
      status: 409,
      message: "ProjectDecision changed while the update was being applied. Reload and try again."
    });
  });
});
