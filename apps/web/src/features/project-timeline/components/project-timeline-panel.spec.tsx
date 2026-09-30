import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectTimelineResponse } from "@ai-context/contracts";

import { listProjectTimeline } from "@/features/project-timeline/api/project-timeline-api";
import {
  ProjectTimelinePanel,
  projectTimelineQueryKey
} from "@/features/project-timeline/components/project-timeline-panel";

type QueryOptions = {
  enabled?: boolean;
  queryFn: () => Promise<unknown>;
  queryKey: readonly unknown[];
};

type QueryState = {
  data?: ProjectTimelineResponse;
  error?: unknown;
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
};

let queryOptions: QueryOptions[] = [];
let queryState: QueryState;
const refetch = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: QueryOptions) => {
    queryOptions.push(options);
    return { ...queryState, refetch };
  }
}));

vi.mock("@/features/project-timeline/api/project-timeline-api", () => ({
  listProjectTimeline: vi.fn()
}));

const timelineResponse: ProjectTimelineResponse = {
  items: [
    {
      type: "DECISION_EFFECTIVE",
      sourceId: "decision_1",
      repositoryId: "repository_1",
      occurredAt: "2026-09-30T10:30:00.000Z",
      decisionId: "decision_1",
      title: "Adopt PostgreSQL",
      affectedArea: "Infrastructure",
      status: "ACTIVE",
      decidedAt: "2026-09-30T10:30:00.000Z",
      sourceProjectContextId: null,
      sourceRepositoryUpdateId: null,
      sourceCommitSha: null
    },
    {
      type: "REPOSITORY_UPDATE",
      sourceId: "update_1",
      repositoryId: "repository_1",
      occurredAt: "2026-09-29T10:00:00.000Z",
      triggerType: "MANUAL",
      status: "COMPLETED",
      baseCommitSha: "1234567890abcdef1234567890abcdef12345678",
      targetCommitSha: "abcdef1234567890abcdef1234567890abcdef12",
      startedAt: "2026-09-29T10:00:01.000Z",
      completedAt: "2026-09-29T10:02:00.000Z",
      failedAt: null,
      scanId: "scan_1",
      analysisId: "analysis_1",
      projectContextId: "project_context_1"
    },
    {
      type: "CONTEXT_PROMOTED",
      sourceId: "history_1",
      repositoryId: "repository_1",
      occurredAt: "2026-09-28T10:00:00.000Z",
      projectContextId: "project_context_2",
      contextId: "context_2",
      contextVersion: "v3",
      generatedAt: "2026-09-28T09:58:00.000Z",
      commitSha: "fedcba0987654321fedcba0987654321fedcba09",
      scanId: "scan_2",
      analysisId: "analysis_2"
    },
    {
      type: "REPOSITORY_CONNECTED",
      sourceId: "repository_1",
      repositoryId: "repository_1",
      occurredAt: "2026-08-15T10:00:00.000Z",
      repositoryName: "ctxaro",
      repositoryFullName: "owner/ctxaro"
    }
  ],
  pagination: {
    page: 1,
    pageSize: 20,
    total: 24,
    totalPages: 2,
    hasNextPage: true,
    hasPreviousPage: false
  }
};

function render(repositoryId = "repository_1", accessToken = "access_token") {
  return renderToStaticMarkup(
    <MemoryRouter>
      <ProjectTimelinePanel accessToken={accessToken} repositoryId={repositoryId} />
    </MemoryRouter>
  );
}

describe("ProjectTimelinePanel", () => {
  beforeEach(() => {
    queryOptions = [];
    queryState = {
      data: timelineResponse,
      error: null,
      isError: false,
      isFetching: false,
      isLoading: false
    };
    refetch.mockReset();
    vi.mocked(listProjectTimeline).mockReset();
  });

  it("uses the repository-scoped default pagination query", async () => {
    const markup = render();

    expect(queryOptions[0]?.queryKey).toEqual(["repositories", "repository_1", "timeline", 1, 20]);
    expect(queryOptions[0]?.enabled).toBe(true);
    expect(markup).toContain("Timeline");

    await queryOptions[0]?.queryFn();
    expect(listProjectTimeline).toHaveBeenCalledWith("access_token", "repository_1", {
      page: 1,
      pageSize: 20
    });
  });

  it("keeps repository cache keys and API requests isolated", async () => {
    render("repository_a");
    const firstQuery = queryOptions[0];
    queryOptions = [];
    render("repository_b");
    const secondQuery = queryOptions[0];

    expect(firstQuery?.queryKey[1]).toBe("repository_a");
    expect(secondQuery?.queryKey[1]).toBe("repository_b");
    await firstQuery?.queryFn();
    await secondQuery?.queryFn();
    expect(listProjectTimeline).toHaveBeenNthCalledWith(1, "access_token", "repository_a", {
      page: 1,
      pageSize: 20
    });
    expect(listProjectTimeline).toHaveBeenNthCalledWith(2, "access_token", "repository_b", {
      page: 1,
      pageSize: 20
    });
  });

  it("disables the query without both repository and session scope", () => {
    render("", "access_token");
    expect(queryOptions[0]?.enabled).toBe(false);

    queryOptions = [];
    render("repository_1", "");
    expect(queryOptions[0]?.enabled).toBe(false);
  });

  it("renders loading, empty, and error states with retry", () => {
    queryState = { isError: false, isFetching: false, isLoading: true };
    expect(render()).toContain("Loading timeline");

    queryState = {
      data: {
        ...timelineResponse,
        items: [],
        pagination: { ...timelineResponse.pagination, total: 0 }
      },
      isError: false,
      isFetching: false,
      isLoading: false
    };
    expect(render()).toContain("No timeline activity yet");

    queryState = {
      error: new Error("offline"),
      isError: true,
      isFetching: false,
      isLoading: false
    };
    const errorMarkup = render();
    expect(errorMarkup).toContain("Timeline unavailable");
    expect(errorMarkup).toContain("Retry");
  });

  it("renders every item type in the backend-provided order", () => {
    const markup = render();
    const decisionIndex = markup.indexOf("Adopt PostgreSQL");
    const updateIndex = markup.indexOf("Repository update");
    const contextIndex = markup.indexOf("Context promoted");
    const connectedIndex = markup.indexOf("Repository connected");

    expect(decisionIndex).toBeGreaterThan(-1);
    expect(updateIndex).toBeGreaterThan(decisionIndex);
    expect(contextIndex).toBeGreaterThan(updateIndex);
    expect(connectedIndex).toBeGreaterThan(contextIndex);
    expect(markup).toContain("Decision effective");
    expect(markup).toContain("Infrastructure");
    expect(markup).toContain("Manual");
    expect(markup).toContain("1234567 → abcdef1");
    expect(markup).toContain("v3");
    expect(markup).toContain("owner/ctxaro");
  });

  it("uses only valid existing destinations", () => {
    const markup = render();

    expect(markup).toContain('href="/repositories/repository_1/decisions"');
    expect(markup).toContain('href="/repositories/repository_1#updates"');
    expect(markup).toContain('href="/analyses/analysis_1"');
    expect(markup).toContain('href="/analyses/analysis_2#project-context"');
  });

  it("renders backend pagination metadata and boundary controls", () => {
    const markup = render();

    expect(projectTimelineQueryKey("repository_1", 2, 20)).toEqual([
      "repositories",
      "repository_1",
      "timeline",
      2,
      20
    ]);
    expect(markup).toContain("Page 1 of 2 · 24 total");
    expect(markup).toMatch(/disabled=""[^>]*>.*Previous/s);
    expect(markup).toContain("Next");
  });
});
