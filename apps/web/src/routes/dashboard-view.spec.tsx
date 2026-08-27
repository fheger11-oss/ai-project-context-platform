import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardProjectsResponse } from "@ai-context/contracts";

import { listDashboardProjects } from "@/features/dashboard/api/dashboard-api";
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

const queryOptions: QueryOptions[] = [];
const refetch = vi.fn();
let queryState: QueryState = {};
let accessToken = "access_token";

const nonEmptyResponse: DashboardProjectsResponse = {
  projects: [
    {
      repository: {
        id: "repository_1",
        name: "project",
        fullName: "owner/project",
        owner: "owner",
        description: null,
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
      }
    }
  ]
};

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: QueryOptions) => {
    queryOptions.push(options);

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

describe("DashboardView", () => {
  beforeEach(() => {
    queryOptions.length = 0;
    queryState = {};
    accessToken = "access_token";
    refetch.mockReset();
    vi.mocked(listDashboardProjects).mockReset();
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

    expect(queryOptions[0]?.queryKey).toEqual(["dashboard", "projects"]);
    expect(queryOptions[0]?.enabled).toBe(true);
    expect(listDashboardProjects).toHaveBeenCalledWith("access_token");
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

  it("displays the data-ready foundation for non-empty responses", () => {
    queryState = { data: nonEmptyResponse, isSuccess: true };

    const markup = renderToStaticMarkup(<DashboardView />);

    expect(markup).toContain("Projects overview");
    expect(markup).toContain("1 connected project ready.");
    expect(markup).toContain("Sprint 8.4");
  });

  it("keeps the authenticated shell dependency boundary intact", () => {
    accessToken = "";

    renderToStaticMarkup(<DashboardView />);

    expect(queryOptions[0]?.enabled).toBe(false);
  });
});
