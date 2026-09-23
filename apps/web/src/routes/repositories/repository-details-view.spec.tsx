import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  DashboardProjectSummary,
  DashboardProjectsResponse,
  RepositoryCurrentUpdateResponse,
  RepositorySummary,
  RepositoryUpdateHistoryResponse,
  ScanHistoryResponse
} from "@ai-context/contracts";

import { listDashboardProjects } from "@/features/dashboard/api/dashboard-api";
import {
  getCurrentRepositoryUpdate,
  getRepository,
  getRepositoryUpdateHistory,
  refreshRepositoryState,
  runRepositoryUpdate
} from "@/features/repositories/api/repositories-api";
import { getScanHistory } from "@/features/scans/api/scan-api";
import { RepositoryDetailsView } from "./repository-details-view";

type QueryOptions = {
  enabled?: boolean;
  queryFn: () => Promise<unknown>;
  queryKey: readonly unknown[];
};

type QueryResult = {
  data?: unknown;
  error?: unknown;
  isError?: boolean;
  isFetching?: boolean;
  isLoading?: boolean;
  isSuccess?: boolean;
};

type MutationOptions = {
  mutationFn: () => Promise<unknown>;
  onSuccess?: (data?: unknown) => Promise<void>;
};

const queryOptions: QueryOptions[] = [];
let accessToken = "access_token";
let repositoryQuery: QueryResult = {};
let latestScanQuery: QueryResult = {};
let dashboardQuery: QueryResult = {};
let updateHistoryQuery: QueryResult = {};
let currentUpdateQuery: QueryResult = {};
const mutationOptions: MutationOptions[] = [];
const invalidateQueries = vi.fn();

const repository: RepositorySummary = {
  id: "repository_1",
  githubId: "github_1",
  name: "project",
  fullName: "owner/project",
  owner: "owner",
  description: "Repository description",
  defaultBranch: "main",
  visibility: "PRIVATE",
  language: "TypeScript",
  stars: 5,
  forks: 2,
  isArchived: false,
  cloneUrl: "https://github.com/owner/project.git",
  htmlUrl: "https://github.com/owner/project",
  githubUpdatedAt: "2026-08-26T09:00:00.000Z",
  lastSyncedAt: "2026-08-26T10:00:00.000Z"
};

const scan: ScanHistoryResponse["items"][number] = {
  id: "scan_1",
  repositoryId: "repository_1",
  status: "COMPLETED",
  commitSha: "abcdef1234567890",
  startedAt: "2026-08-26T10:01:00.000Z",
  completedAt: "2026-08-26T10:02:00.000Z",
  durationMs: 60000,
  totalFiles: 42,
  totalSize: "2048",
  usage: {
    filesProcessed: 42,
    totalBytesConsidered: "2048"
  },
  limit: {
    reached: false,
    reason: null
  },
  createdAt: "2026-08-26T10:01:00.000Z",
  updatedAt: "2026-08-26T10:02:00.000Z",
  latestAnalysis: null
};

const projectSummary: DashboardProjectSummary = {
  repository: {
    id: "repository_1",
    name: "project",
    fullName: "owner/project",
    owner: "owner",
    description: "Repository description",
    defaultBranch: "main",
    visibility: "PRIVATE",
    language: "TypeScript",
    isArchived: false,
    lastSyncedAt: "2026-08-26T10:00:00.000Z"
  },
  state: {
    repositoryId: "repository_1",
    freshnessStatus: "UNKNOWN",
    remoteHeadCommitSha: null,
    remoteHeadCheckedAt: null,
    lastScannedCommitSha: "abcdef1234567890",
    lastAnalyzedCommitSha: "abcdef1234567890",
    currentProjectContextId: "project_context_1",
    currentContextCommitSha: "abcdef1234567890",
    lastUpdateStatus: null
  },
  latestScan: {
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
  },
  latestAnalysis: {
    analysisId: "analysis_1",
    scanId: "scan_1",
    analyzerVersion: "analysis-engine@1",
    commitSha: "abcdef1234567890",
    generatedAt: "2026-08-26T10:03:00.000Z"
  },
  latestContext: null,
  documents: {
    available: false,
    count: 0
  },
  aiExport: {
    available: false
  }
};

const completedUpdate: RepositoryUpdateHistoryResponse["items"][number] = {
  id: "update_completed",
  repositoryId: "repository_1",
  triggerType: "MANUAL",
  status: "COMPLETED",
  baseCommitSha: "abcdef1234567890",
  targetCommitSha: "bcdef12345678901",
  startedAt: "2026-08-26T10:05:00.000Z",
  completedAt: "2026-08-26T10:08:00.000Z",
  failedAt: null,
  failureReason: null,
  scanId: "scan_2",
  analysisId: "analysis_2",
  projectContextId: "context_2",
  createdAt: "2026-08-26T10:04:59.000Z",
  updatedAt: "2026-08-26T10:08:00.000Z"
};

function dashboardResponse(projects: DashboardProjectSummary[]): DashboardProjectsResponse {
  return { projects };
}

vi.mock("@tanstack/react-query", () => ({
  useMutation: (options: MutationOptions) => {
    mutationOptions.push(options);

    return {
      isError: false,
      isPending: false,
      isSuccess: false,
      mutate: vi.fn()
    };
  },
  useQuery: (options: QueryOptions) => {
    queryOptions.push(options);

    if (options.queryKey[0] === "repositories" && options.queryKey[2] === "updates") {
      const result = options.queryKey[3] === "current" ? currentUpdateQuery : updateHistoryQuery;

      return {
        data: result.data,
        error: result.error,
        isError: result.isError ?? false,
        isFetching: result.isFetching ?? false,
        isLoading: result.isLoading ?? false,
        isSuccess: result.isSuccess ?? false,
        refetch: vi.fn()
      };
    }

    if (options.queryKey[0] === "repositories") {
      return {
        data: repositoryQuery.data,
        error: repositoryQuery.error,
        isError: repositoryQuery.isError ?? false,
        isFetching: repositoryQuery.isFetching ?? false,
        isLoading: repositoryQuery.isLoading ?? false,
        isSuccess: repositoryQuery.isSuccess ?? false,
        refetch: vi.fn()
      };
    }

    if (options.queryKey[0] === "scan-history") {
      return {
        data: latestScanQuery.data,
        error: latestScanQuery.error,
        isError: latestScanQuery.isError ?? false,
        isFetching: latestScanQuery.isFetching ?? false,
        isLoading: latestScanQuery.isLoading ?? false,
        isSuccess: latestScanQuery.isSuccess ?? false,
        refetch: vi.fn()
      };
    }

    return {
      data: dashboardQuery.data,
      error: dashboardQuery.error,
      isError: dashboardQuery.isError ?? false,
      isFetching: dashboardQuery.isFetching ?? false,
      isLoading: dashboardQuery.isLoading ?? false,
      isSuccess: dashboardQuery.isSuccess ?? false,
      refetch: vi.fn()
    };
  },
  useQueryClient: () => ({
    invalidateQueries
  })
}));

vi.mock("react-router-dom", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
  useParams: () => ({ id: "repository_1" })
}));

vi.mock("@/features/auth/stores/auth-session-store", () => ({
  useAuthSessionStore: (selector: (state: { accessToken: string }) => string) =>
    selector({ accessToken })
}));

vi.mock("@/features/repositories/api/repositories-api", async (importOriginal) => {
  const actual = (await importOriginal()) as object;

  return {
    ...actual,
    getCurrentRepositoryUpdate: vi.fn(),
    getRepository: vi.fn(),
    getRepositoryUpdateHistory: vi.fn(),
    refreshRepositoryState: vi.fn(),
    runRepositoryUpdate: vi.fn(),
    syncRepository: vi.fn()
  };
});

vi.mock("@/features/scans/api/scan-api", async (importOriginal) => {
  const actual = (await importOriginal()) as object;

  return {
    ...actual,
    getScanHistory: vi.fn()
  };
});

vi.mock("@/features/dashboard/api/dashboard-api", async (importOriginal) => {
  const actual = (await importOriginal()) as object;

  return {
    ...actual,
    listDashboardProjects: vi.fn()
  };
});

vi.mock("@/features/scans/components/repository-scan-action", () => ({
  RepositoryScanAction: ({ repositoryId }: { repositoryId: string }) => (
    <section>Scan action for {repositoryId}</section>
  )
}));

vi.mock("@/features/analysis/components/start-analysis-button", () => ({
  StartAnalysisButton: ({
    label,
    scanId
  }: {
    accessToken: string;
    label?: string;
    pendingLabel?: string;
    scanId: string;
  }) => (
    <button type="button">
      {label ?? "Analyze scan"} for {scanId}
    </button>
  )
}));

vi.mock("@/features/scans/components/scan-history", () => ({
  ScanHistory: ({ repositoryId }: { repositoryId: string }) => (
    <section>Project activity for {repositoryId}</section>
  )
}));

describe("RepositoryDetailsView", () => {
  beforeEach(() => {
    queryOptions.length = 0;
    accessToken = "access_token";
    repositoryQuery = { data: repository };
    latestScanQuery = {
      data: {
        items: [scan],
        pagination: {
          page: 1,
          pageSize: 1,
          totalItems: 1,
          totalPages: 1
        }
      } satisfies ScanHistoryResponse
    };
    dashboardQuery = { data: dashboardResponse([projectSummary]) };
    updateHistoryQuery = {
      data: {
        items: [completedUpdate],
        pagination: {
          page: 1,
          pageSize: 5,
          total: 1,
          hasNextPage: false
        }
      } satisfies RepositoryUpdateHistoryResponse
    };
    currentUpdateQuery = {
      data: {
        update: null
      } satisfies RepositoryCurrentUpdateResponse
    };
    mutationOptions.length = 0;
    invalidateQueries.mockClear();
    vi.mocked(getCurrentRepositoryUpdate).mockReset();
    vi.mocked(getRepository).mockReset();
    vi.mocked(getRepositoryUpdateHistory).mockReset();
    vi.mocked(refreshRepositoryState).mockReset();
    vi.mocked(runRepositoryUpdate).mockReset();
    vi.mocked(getScanHistory).mockReset();
    vi.mocked(listDashboardProjects).mockReset();
  });

  it("renders the existing repository workspace route", () => {
    const markup = renderToStaticMarkup(<RepositoryDetailsView />);

    expect(markup).toContain("project");
    expect(markup).toContain("Repository description");
    expect(markup).toContain("Workflow access");
  });

  it("keeps repository information and scan functionality available", () => {
    const markup = renderToStaticMarkup(<RepositoryDetailsView />);

    expect(markup).toContain("owner");
    expect(markup).toContain("private");
    expect(markup).toContain("main");
    expect(markup).toContain("Open GitHub");
    expect(markup).toContain("Sync metadata");
    expect(markup).toContain("Scan action for repository_1");
    expect(markup).toContain("Project activity for repository_1");
  });

  it("shows neutral RepositoryState freshness and commit information", () => {
    const markup = renderToStaticMarkup(<RepositoryDetailsView />);

    expect(markup).toContain("Freshness");
    expect(markup).toContain("Unknown");
    expect(markup).toContain("Remote HEAD");
    expect(markup).toContain("Not available");
    expect(markup).toContain("Current context");
    expect(markup).toContain("Last scanned commit");
    expect(markup).toContain("Last analyzed commit");
    expect(markup).toContain("abcdef123456");
    expect(markup).toContain("Update repository");
    expect(markup).not.toContain("Up to date");
  });

  it("renders current update status and recent update history", () => {
    currentUpdateQuery = {
      data: {
        update: {
          ...completedUpdate,
          id: "update_running",
          status: "RUNNING",
          startedAt: "2026-08-26T10:10:00.000Z",
          completedAt: null,
          targetCommitSha: "runningabcdef123456"
        }
      } satisfies RepositoryCurrentUpdateResponse
    };

    const markup = renderToStaticMarkup(<RepositoryDetailsView />);

    expect(markup).toContain("Updates");
    expect(markup).toContain("Current update");
    expect(markup).toContain("Running");
    expect(markup).toContain("runningabcde");
    expect(markup).toContain("Completed");
    expect(markup).toContain("bcdef1234567");
  });

  it("renders failed update history with failure reason", () => {
    updateHistoryQuery = {
      data: {
        items: [
          {
            ...completedUpdate,
            id: "update_failed",
            status: "FAILED",
            completedAt: null,
            failedAt: "2026-08-26T10:09:00.000Z",
            failureReason: "CONTEXT_GENERATION_FAILED",
            projectContextId: null
          }
        ],
        pagination: {
          page: 1,
          pageSize: 5,
          total: 1,
          hasNextPage: false
        }
      } satisfies RepositoryUpdateHistoryResponse
    };

    const markup = renderToStaticMarkup(<RepositoryDetailsView />);

    expect(markup).toContain("Failed");
    expect(markup).toContain("CONTEXT_GENERATION_FAILED");
  });

  it("renders empty update history", () => {
    updateHistoryQuery = {
      data: {
        items: [],
        pagination: {
          page: 1,
          pageSize: 5,
          total: 0,
          hasNextPage: false
        }
      } satisfies RepositoryUpdateHistoryResponse
    };

    const markup = renderToStaticMarkup(<RepositoryDetailsView />);

    expect(markup).toContain("No update in progress");
    expect(markup).toContain("No repository updates yet");
  });

  it("renders update history loading and error states", () => {
    updateHistoryQuery = { isLoading: true };
    currentUpdateQuery = { isLoading: true };

    expect(renderToStaticMarkup(<RepositoryDetailsView />)).toContain("Loading update status");

    updateHistoryQuery = { isError: true };
    currentUpdateQuery = { data: { update: null } satisfies RepositoryCurrentUpdateResponse };

    expect(renderToStaticMarkup(<RepositoryDetailsView />)).toContain("Updates unavailable");
  });

  it.each([
    ["FRESH", "Fresh"],
    ["STALE", "Stale"],
    ["UNKNOWN", "Unknown"]
  ] as const)("renders %s freshness from RepositoryState", (freshnessStatus, label) => {
    dashboardQuery = {
      data: dashboardResponse([
        {
          ...projectSummary,
          state: {
            ...projectSummary.state!,
            freshnessStatus,
            remoteHeadCommitSha: "remoteabcdef123456",
            currentContextCommitSha:
              freshnessStatus === "FRESH" ? "remoteabcdef123456" : "contextabcdef123456"
          }
        }
      ])
    };

    const markup = renderToStaticMarkup(<RepositoryDetailsView />);

    expect(markup).toContain(label);
    expect(markup).toContain("remoteabcdef");
  });

  it("shows analysis access when analysis exists", () => {
    const markup = renderToStaticMarkup(<RepositoryDetailsView />);

    expect(markup).toContain("Analysis");
    expect(markup).toContain("Completed analysis available");
    expect(markup).toContain("Open analysis");
    expect(markup).toContain("/analyses/analysis_1");
    expect(markup).not.toContain("Analyze latest scan for scan_1");
  });

  it("uses the existing analysis action for a completed latest scan without analysis", () => {
    dashboardQuery = {
      data: dashboardResponse([
        {
          ...projectSummary,
          latestAnalysis: null
        }
      ])
    };

    const markup = renderToStaticMarkup(<RepositoryDetailsView />);

    expect(markup).toContain("Latest scan is ready");
    expect(markup).toContain("Analyze this completed scan to continue the project workflow.");
    expect(markup).toContain("Analyze latest scan for scan_1");
  });

  it("shows Context workflow access when analysis exists but Context is missing", () => {
    const markup = renderToStaticMarkup(<RepositoryDetailsView />);

    expect(markup).toContain("Project Context");
    expect(markup).toContain("Generated from analysis");
    expect(markup).toContain("Open Context workflow");
    expect(markup).toContain("/analyses/analysis_1");
  });

  it("shows Documents and AI Export access when Context exists", () => {
    dashboardQuery = {
      data: dashboardResponse([
        {
          ...projectSummary,
          latestContext: {
            id: "project_context_1",
            contextId: "context_1",
            contextVersion: "context-engine@1",
            generatedAt: "2026-08-26T10:04:00.000Z",
            createdAt: "2026-08-26T10:04:01.000Z"
          },
          documents: {
            available: true,
            count: 2
          },
          aiExport: {
            available: true
          }
        }
      ])
    };

    const markup = renderToStaticMarkup(<RepositoryDetailsView />);

    expect(markup).toContain("context-engine@1");
    expect(markup).toContain("Documents");
    expect(markup).toContain("2 generated");
    expect(markup).toContain("Open Documents");
    expect(markup).toContain("AI Export");
    expect(markup).toContain("Available from Project Context");
    expect(markup).toContain("Open AI Export");
    expect(markup).toContain("/analyses/analysis_1");
  });

  it("does not add per-project engine API requests beyond the existing workspace queries", async () => {
    vi.mocked(getRepository).mockResolvedValue(repository);
    vi.mocked(getScanHistory).mockResolvedValue({
      items: [scan],
      pagination: {
        page: 1,
        pageSize: 1,
        totalItems: 1,
        totalPages: 1
      }
    });
    vi.mocked(listDashboardProjects).mockResolvedValue(dashboardResponse([projectSummary]));
    renderToStaticMarkup(<RepositoryDetailsView />);

    await Promise.all(queryOptions.map((option) => option.queryFn()));

    expect(queryOptions.map((option) => option.queryKey)).toEqual([
      ["repositories", "repository_1"],
      ["scan-history", "repository_1", 1, 1],
      ["dashboard", "projects"],
      ["repositories", "repository_1", "updates", 1, 5],
      ["repositories", "repository_1", "updates", "current"]
    ]);
    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(getScanHistory).toHaveBeenCalledTimes(1);
    expect(listDashboardProjects).toHaveBeenCalledTimes(1);
    expect(getRepositoryUpdateHistory).toHaveBeenCalledTimes(1);
    expect(getCurrentRepositoryUpdate).toHaveBeenCalledTimes(1);
  });

  it("refreshes repository and dashboard state after metadata sync succeeds", async () => {
    renderToStaticMarkup(<RepositoryDetailsView />);

    await mutationOptions[0]?.onSuccess?.();

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["dashboard", "projects"]
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["repositories"]
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["repositories", "repository_1"]
    });
  });

  it("refreshes repository freshness without triggering scan APIs", async () => {
    vi.mocked(refreshRepositoryState).mockResolvedValue({
      ...projectSummary.state!,
      freshnessStatus: "FRESH",
      remoteHeadCommitSha: "abcdef1234567890",
      remoteHeadCheckedAt: "2026-09-22T12:30:00.000Z"
    });
    renderToStaticMarkup(<RepositoryDetailsView />);

    await mutationOptions[1]?.mutationFn();
    await mutationOptions[1]?.onSuccess?.();

    expect(refreshRepositoryState).toHaveBeenCalledWith("access_token", "repository_1");
    expect(getScanHistory).not.toHaveBeenCalled();
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["dashboard", "projects"]
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["repositories", "repository_1", "state"]
    });
  });

  it("runs a manual repository update and refreshes repository state views", async () => {
    vi.mocked(runRepositoryUpdate).mockResolvedValue({
      noop: false,
      updateId: "update_1",
      status: "COMPLETED",
      triggerType: "MANUAL",
      baseCommitSha: "abcdef1234567890",
      targetCommitSha: "bcdef12345678901",
      scanId: "scan_2",
      analysisId: "analysis_2",
      projectContextId: "context_2",
      freshnessStatus: "FRESH"
    });
    renderToStaticMarkup(<RepositoryDetailsView />);

    await mutationOptions[2]?.mutationFn();
    await mutationOptions[2]?.onSuccess?.({
      noop: false,
      updateId: "update_1",
      status: "COMPLETED",
      triggerType: "MANUAL",
      baseCommitSha: "abcdef1234567890",
      targetCommitSha: "bcdef12345678901",
      scanId: "scan_2",
      analysisId: "analysis_2",
      projectContextId: "context_2",
      freshnessStatus: "FRESH"
    });

    expect(runRepositoryUpdate).toHaveBeenCalledWith("access_token", "repository_1");
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["dashboard", "projects"]
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["repositories", "repository_1", "state"]
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["scan-history", "repository_1"]
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["repositories", "repository_1", "updates"]
    });
  });
});
