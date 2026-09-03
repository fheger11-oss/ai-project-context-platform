import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardProjectsResponse } from "@ai-context/contracts";

import { listDashboardProjects } from "@/features/dashboard/api/dashboard-api";
import { getScanLimits } from "@/features/scans/api/scan-api";
import { DashboardView } from "./dashboard-view";

type QueryOptions = {
  enabled?: boolean;
  queryFn: () => Promise<unknown>;
  queryKey: readonly unknown[];
};

type QueryState = {
  data?: DashboardProjectsResponse;
  error?: unknown;
  isError?: boolean;
  isFetching?: boolean;
  isLoading?: boolean;
  isSuccess?: boolean;
};

const scanLimits = {
  maxFiles: 5000,
  maxIndividualFileSizeBytes: 1048576,
  maxTotalSizeBytes: 26214400
};

const queryOptions: QueryOptions[] = [];
const refetch = vi.fn();
let queryState: QueryState = {};
let accessToken = "access_token";

function project(
  overrides: Partial<DashboardProjectsResponse["projects"][number]> = {}
): DashboardProjectsResponse["projects"][number] {
  return {
    repository: {
      id: "repository_1",
      name: "project",
      fullName: "owner/project",
      owner: "owner",
      description: "A verified project summary.",
      defaultBranch: "main",
      visibility: "PRIVATE",
      language: "TypeScript",
      isArchived: false,
      lastSyncedAt: "2026-08-26T10:00:00.000Z"
    },
    latestScan: null,
    latestAnalysis: null,
    latestContext: null,
    documents: {
      available: false,
      count: 0
    },
    aiExport: {
      available: false
    },
    ...overrides
  };
}

const latestScan: NonNullable<DashboardProjectsResponse["projects"][number]["latestScan"]> = {
  id: "scan_1",
  status: "COMPLETED",
  commitSha: "abcdef1234567890",
  createdAt: "2026-08-26T10:01:00.000Z",
  updatedAt: "2026-08-26T10:02:00.000Z",
  completedAt: "2026-08-26T10:02:00.000Z",
  totalFiles: 42,
  totalSize: "2048",
  usage: {
    filesProcessed: 42,
    totalBytesConsidered: "2048"
  },
  limit: {
    reached: false,
    reason: null
  }
};

const latestAnalysis: NonNullable<DashboardProjectsResponse["projects"][number]["latestAnalysis"]> =
  {
    analysisId: "analysis_1",
    scanId: "scan_1",
    analyzerVersion: "analysis-engine@1",
    commitSha: "abcdef1234567890",
    generatedAt: "2026-08-26T10:03:00.000Z"
  };

const latestContext: NonNullable<DashboardProjectsResponse["projects"][number]["latestContext"]> = {
  id: "project_context_1",
  contextId: "context_1",
  contextVersion: "context-engine@1",
  generatedAt: "2026-08-26T10:04:00.000Z",
  createdAt: "2026-08-26T10:04:01.000Z"
};

const nonEmptyResponse: DashboardProjectsResponse = {
  projects: [project()]
};

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: QueryOptions) => {
    queryOptions.push(options);

    if (options.queryKey[0] === "scan-limits") {
      return {
        data: scanLimits,
        error: null,
        isError: false,
        isFetching: false,
        isLoading: false,
        isSuccess: true,
        refetch
      };
    }

    return {
      data: queryState.data,
      error: queryState.error,
      isError: queryState.isError ?? false,
      isFetching: queryState.isFetching ?? false,
      isLoading: queryState.isLoading ?? false,
      isSuccess: queryState.isSuccess ?? false,
      refetch
    };
  }
}));

vi.mock("react-router-dom", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>
}));

vi.mock("@/features/auth/stores/auth-session-store", () => ({
  useAuthSessionStore: (selector: (state: { accessToken: string }) => string) =>
    selector({ accessToken })
}));

vi.mock("@/features/dashboard/api/dashboard-api", async (importOriginal) => {
  const actual = (await importOriginal()) as object;

  return {
    ...actual,
    listDashboardProjects: vi.fn()
  };
});

vi.mock("@/features/scans/api/scan-api", async (importOriginal) => {
  const actual = (await importOriginal()) as object;

  return {
    ...actual,
    getScanLimits: vi.fn()
  };
});

describe("DashboardView", () => {
  beforeEach(() => {
    queryOptions.length = 0;
    queryState = {};
    accessToken = "access_token";
    refetch.mockReset();
    vi.mocked(listDashboardProjects).mockReset();
    vi.mocked(getScanLimits).mockReset();
  });

  it("renders the Dashboard route foundation", () => {
    const markup = renderToStaticMarkup(<DashboardView />);

    expect(markup).toContain("Project dashboard");
    expect(markup).toContain("Dashboard");
  });

  it("requests dashboard projects through React Query", async () => {
    vi.mocked(listDashboardProjects).mockResolvedValue({ projects: [] });
    renderToStaticMarkup(<DashboardView />);

    await queryOptions[0]?.queryFn();
    await queryOptions[1]?.queryFn();

    expect(queryOptions[0]?.queryKey).toEqual(["dashboard", "projects"]);
    expect(queryOptions[0]?.enabled).toBe(true);
    expect(listDashboardProjects).toHaveBeenCalledWith("access_token");
    expect(queryOptions[1]?.queryKey).toEqual(["scan-limits"]);
    expect(queryOptions[1]?.enabled).toBe(true);
    expect(getScanLimits).toHaveBeenCalledWith("access_token");
  });

  it("displays the loading state", () => {
    queryState = { isLoading: true };

    const markup = renderToStaticMarkup(<DashboardView />);

    expect(markup).toContain("Loading dashboard");
  });

  it("displays the empty project state", () => {
    queryState = { data: { projects: [] }, isSuccess: true };

    const markup = renderToStaticMarkup(<DashboardView />);

    expect(markup).toContain("No connected projects");
    expect(markup).toContain("Connect repository");
    expect(markup).toContain("/repositories/connect");
  });

  it("displays the error state with retry", () => {
    queryState = { isError: true };

    const markup = renderToStaticMarkup(<DashboardView />);

    expect(markup).toContain("Dashboard unavailable");
    expect(markup).toContain("Retry");
  });

  it("renders projects from the DashboardProjectsResponse", () => {
    queryState = { data: nonEmptyResponse, isSuccess: true };

    const markup = renderToStaticMarkup(<DashboardView />);

    expect(markup).toContain("Projects overview");
    expect(markup).toContain("1 connected project shown.");
    expect(markup).toContain("project");
    expect(markup).toContain("owner/project");
    expect(markup).toContain("private");
    expect(markup).toContain("main");
    expect(markup).toContain("TypeScript");
    expect(markup).toContain("A verified project summary.");
  });

  it("renders multiple projects", () => {
    queryState = {
      data: {
        projects: [
          project(),
          project({
            repository: {
              ...project().repository,
              id: "repository_2",
              name: "second-project",
              fullName: "owner/second-project",
              visibility: "PUBLIC"
            }
          })
        ]
      },
      isSuccess: true
    };

    const markup = renderToStaticMarkup(<DashboardView />);

    expect(markup).toContain("2 connected projects shown.");
    expect(markup).toContain("owner/project");
    expect(markup).toContain("owner/second-project");
    expect(queryOptions.filter((options) => options.queryKey[0] === "dashboard")).toHaveLength(1);
  });

  it("displays latest scan status and commit when available", () => {
    queryState = {
      data: { projects: [project({ latestScan })] },
      isSuccess: true
    };

    const markup = renderToStaticMarkup(<DashboardView />);

    expect(markup).toContain("Latest scan");
    expect(markup).toContain("Completed");
    expect(markup).toContain("abcdef123456");
    expect(markup).toContain("Scan completed");
    expect(markup).toContain("42 / 5,000");
    expect(markup).toContain("2,048 bytes / 25 MiB");
  });

  it("displays scan limit failures in dashboard scan summaries", () => {
    queryState = {
      data: {
        projects: [
          project({
            latestScan: {
              ...latestScan,
              status: "FAILED",
              completedAt: null,
              limit: {
                reached: true,
                reason: "FILE_COUNT_LIMIT"
              },
              usage: {
                filesProcessed: 5000,
                totalBytesConsidered: "12345"
              }
            }
          })
        ]
      },
      isSuccess: true
    };

    const markup = renderToStaticMarkup(<DashboardView />);

    expect(markup).toContain("File limit reached");
    expect(markup).toContain("5,000 / 5,000");
  });

  it("handles missing scan without inventing state", () => {
    queryState = { data: nonEmptyResponse, isSuccess: true };

    const markup = renderToStaticMarkup(<DashboardView />);

    expect(markup).toContain("No scan");
    expect(markup).toContain("Start scan");
  });

  it("displays analysis availability from the summary response", () => {
    queryState = {
      data: { projects: [project({ latestAnalysis, latestScan })] },
      isSuccess: true
    };

    const markup = renderToStaticMarkup(<DashboardView />);

    expect(markup).toContain("Analysis");
    expect(markup).toContain("Available");
    expect(markup).toContain("Generate Context");
  });

  it("displays context availability and version from the summary response", () => {
    queryState = {
      data: { projects: [project({ latestAnalysis, latestContext, latestScan })] },
      isSuccess: true
    };

    const markup = renderToStaticMarkup(<DashboardView />);

    expect(markup).toContain("Context");
    expect(markup).toContain("context-engine@1");
    expect(markup).toContain("Open Project Context");
    expect(markup).toContain("Project Context available");
  });

  it("displays document count and AI export availability", () => {
    queryState = {
      data: {
        projects: [
          project({
            aiExport: { available: true },
            documents: { available: true, count: 3 },
            latestAnalysis,
            latestContext,
            latestScan
          })
        ]
      },
      isSuccess: true
    };

    const markup = renderToStaticMarkup(<DashboardView />);

    expect(markup).toContain("Documents");
    expect(markup).toContain("3 generated");
    expect(markup).toContain("AI Export");
    expect(markup).toContain("Available from Context");
  });

  it("opens projects through the existing repository workspace route", () => {
    queryState = { data: nonEmptyResponse, isSuccess: true };

    const markup = renderToStaticMarkup(<DashboardView />);

    expect(markup).toContain("Open project");
    expect(markup).toContain("/repositories/repository_1");
  });

  it.each([
    ["without scan", project(), "Start scan", "/repositories/repository_1"],
    [
      "with active scan",
      project({ latestScan: { ...latestScan, status: "RUNNING" } }),
      "View scan status",
      "/repositories/repository_1"
    ],
    [
      "with completed scan but no analysis",
      project({ latestScan }),
      "Analyze latest scan",
      "/repositories/repository_1"
    ],
    [
      "with analysis but no context",
      project({ latestAnalysis, latestScan }),
      "Generate Context",
      "/analyses/analysis_1"
    ],
    [
      "with context",
      project({ latestAnalysis, latestContext, latestScan }),
      "Open Project Context",
      "/analyses/analysis_1"
    ]
  ])("sets primary next action for %s", (_label, summary, actionLabel, href) => {
    queryState = { data: { projects: [summary] }, isSuccess: true };

    const markup = renderToStaticMarkup(<DashboardView />);

    expect(markup).toContain(actionLabel);
    expect(markup).toContain(href);
  });

  it("does not issue per-project engine queries", () => {
    queryState = {
      data: {
        projects: [
          project(),
          project({ repository: { ...project().repository, id: "repository_2" } })
        ]
      },
      isSuccess: true
    };

    renderToStaticMarkup(<DashboardView />);

    expect(queryOptions.filter((options) => options.queryKey[0] === "dashboard")).toHaveLength(1);
    expect(queryOptions[0]?.queryKey).toEqual(["dashboard", "projects"]);
  });

  it("keeps the authenticated shell dependency boundary intact", () => {
    accessToken = "";

    renderToStaticMarkup(<DashboardView />);

    expect(queryOptions[0]?.enabled).toBe(false);
  });
});
