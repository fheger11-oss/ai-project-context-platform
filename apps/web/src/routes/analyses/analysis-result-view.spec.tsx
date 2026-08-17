import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalysisResultResponse } from "@ai-context/contracts";

import { AnalysisApiRequestError, getAnalysisResult } from "@/features/analysis/api/analysis-api";
import { AnalysisResultView } from "./analysis-result-view";

type QueryOptions = {
  enabled?: boolean;
  queryFn: () => Promise<unknown>;
  queryKey: readonly unknown[];
};

type QueryState = {
  data?: AnalysisResultResponse;
  error?: unknown;
  isError?: boolean;
  isFetching?: boolean;
  isLoading?: boolean;
};

const queryOptions: QueryOptions[] = [];
let queryState: QueryState = {};
let accessToken = "access_token";

const result: AnalysisResultResponse = {
  analysisId: "analysis_1",
  scanId: "scan_1",
  repositoryId: "repository_1",
  commitSha: "abc123",
  analyzerVersion: "analysis-engine-4.10",
  generatedAt: "2026-08-14T12:00:00.000Z",
  project: {
    ecosystems: [],
    languages: [],
    packageManager: {
      status: "UNKNOWN",
      evidence: []
    },
    frameworks: [],
    manifests: [],
    packages: [],
    dependencies: [],
    issues: []
  },
  files: [],
  sourceStructures: [],
  relationships: [],
  dependencies: [],
  issues: []
};

vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({
    error: null,
    isError: false,
    isPending: false,
    isSuccess: false,
    mutate: vi.fn()
  }),
  useQuery: (options: QueryOptions) => {
    queryOptions.push(options);

    if (options.queryKey[0] !== "analysis") {
      return {
        data: options.queryKey[0] === "context-history" ? { items: [] } : undefined,
        error: undefined,
        isError: false,
        isFetching: false,
        isLoading: false,
        refetch: vi.fn()
      };
    }

    return {
      data: queryState.data,
      error: queryState.error,
      isError: queryState.isError ?? false,
      isFetching: queryState.isFetching ?? false,
      isLoading: queryState.isLoading ?? false,
      refetch: vi.fn()
    };
  },
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn()
  })
}));

vi.mock("react-router-dom", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
  useParams: () => ({ analysisId: "analysis_1" })
}));

vi.mock("@/features/auth/stores/auth-session-store", () => ({
  useAuthSessionStore: (selector: (state: { accessToken: string }) => string) =>
    selector({ accessToken })
}));

vi.mock("@/features/analysis/api/analysis-api", async (importOriginal) => {
  const actual = (await importOriginal()) as object;

  return {
    ...actual,
    getAnalysisResult: vi.fn()
  };
});

describe("AnalysisResultView", () => {
  beforeEach(() => {
    queryOptions.length = 0;
    queryState = {};
    accessToken = "access_token";
    vi.mocked(getAnalysisResult).mockReset();
  });

  it("requests the persisted analysis result through the Analysis API", async () => {
    vi.mocked(getAnalysisResult).mockResolvedValue(result);
    renderToStaticMarkup(<AnalysisResultView />);

    await queryOptions[0]?.queryFn();

    expect(queryOptions[0]?.queryKey).toEqual(["analysis", "analysis_1"]);
    expect(queryOptions[0]?.enabled).toBe(true);
    expect(getAnalysisResult).toHaveBeenCalledWith("access_token", "analysis_1");
  });

  it("renders the returned analysis result", () => {
    queryState = { data: result };

    const markup = renderToStaticMarkup(<AnalysisResultView />);

    expect(markup).toContain("Analysis result");
    expect(markup).toContain("analysis_1");
    expect(markup).toContain("Repository");
  });

  it("renders the existing authentication action when no session is available", () => {
    accessToken = "";

    const markup = renderToStaticMarkup(<AnalysisResultView />);

    expect(markup).toContain("Session required");
    expect(markup).toContain("Sign in with GitHub");
    expect(queryOptions[0]?.enabled).toBe(false);
  });

  it.each([
    [401, "Sign in again to load this analysis."],
    [403, "You do not have access to this analysis."],
    [404, "This analysis was not found."],
    [500, "Analysis result could not be loaded."]
  ])("renders safe API errors for %s", (status, message) => {
    queryState = {
      error: new AnalysisApiRequestError("Prisma stack trace secret", status),
      isError: true
    };

    const markup = renderToStaticMarkup(<AnalysisResultView />);

    expect(markup).toContain(message);
    expect(markup).not.toContain("Prisma stack trace secret");
  });
});
