import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/button";
import type {
  ScanHistoryItem,
  ScanHistoryResponse,
  ScanLimits,
  ScanSnapshot
} from "@/features/scans/api/scan-api";
import { getScanHistory, getScanLimits, ScanApiRequestError } from "@/features/scans/api/scan-api";
import { startAnalysis } from "@/features/analysis/api/analysis-api";
import { ScanHistory, ScanHistoryContent } from "./scan-history";

type QueryOptions = {
  enabled?: boolean;
  queryFn: () => Promise<unknown>;
  queryKey: readonly unknown[];
};

type QueryState = {
  data?: ScanHistoryResponse | ScanLimits;
  error?: unknown;
  isError?: boolean;
  isFetching?: boolean;
  isLoading?: boolean;
};

type ScanQueryState = Omit<QueryState, "data"> & {
  data?: ScanHistoryResponse;
};

type ButtonElementProps = {
  children?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
};

const queryOptions: QueryOptions[] = [];
let queryState: QueryState = {};

const scanLimits: ScanLimits = {
  maxFiles: 5000,
  maxIndividualFileSizeBytes: 1048576,
  maxTotalSizeBytes: 26214400
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
        isLoading: false
      };
    }

    return {
      data: queryState.data,
      error: queryState.error,
      isError: queryState.isError ?? false,
      isFetching: queryState.isFetching ?? false,
      isLoading: queryState.isLoading ?? false
    };
  }
}));

vi.mock("react-router-dom", () => ({
  Link: ({ children, to }: { children?: ReactNode; to: string }) => <a href={to}>{children}</a>
}));

vi.mock("@/features/scans/api/scan-api", async (importOriginal) => {
  const actual = (await importOriginal()) as object;

  return {
    ...actual,
    getScanHistory: vi.fn(),
    getScanLimits: vi.fn()
  };
});

vi.mock("@/features/analysis/components/start-analysis-button", () => ({
  StartAnalysisButton: ({ label = "Analyze scan", scanId }: { label?: string; scanId: string }) => (
    <button type="button">
      {label} {scanId}
    </button>
  )
}));

vi.mock("@/features/analysis/api/analysis-api", async (importOriginal) => {
  const actual = (await importOriginal()) as object;

  return {
    ...actual,
    startAnalysis: vi.fn()
  };
});

const completedScan: ScanSnapshot = {
  id: "scan_completed",
  repositoryId: "repository_1",
  status: "COMPLETED",
  commitSha: "fffed9f5ecab4ebb9a861f357e134b8e16bb4d92",
  startedAt: "2026-08-10T10:00:00.000Z",
  completedAt: "2026-08-10T10:00:06.000Z",
  durationMs: 6864,
  totalFiles: 91,
  totalSize: "563302",
  usage: {
    filesProcessed: 91,
    totalBytesConsidered: "563302"
  },
  limit: {
    reached: false,
    reason: null
  },
  createdAt: "2026-08-10T10:00:00.000Z",
  updatedAt: "2026-08-10T10:00:06.000Z"
};

const failedScan: ScanSnapshot = {
  ...completedScan,
  id: "scan_failed",
  status: "FAILED",
  commitSha: "abc123failed",
  completedAt: null,
  durationMs: null,
  totalFiles: 12,
  totalSize: "98765432101234567890",
  usage: {
    filesProcessed: 12,
    totalBytesConsidered: "98765432101234567890"
  },
  limit: {
    reached: false,
    reason: null
  }
};

function historyResponse(
  items: Array<ScanSnapshot | ScanHistoryItem>,
  page = 1,
  totalPages = 1
): ScanHistoryResponse {
  return {
    items: items.map((item) => ({
      ...item,
      latestAnalysis: "latestAnalysis" in item ? item.latestAnalysis : null
    })),
    pagination: {
      page,
      pageSize: 20,
      totalItems: items.length,
      totalPages
    }
  };
}

const latestAnalysis = {
  analysisId: "analysis_latest",
  scanId: "scan_completed",
  analyzerVersion: "analysis-engine-4.13",
  generatedAt: "2026-08-14T12:05:00.000Z",
  commitSha: "fffed9f5ecab4ebb9a861f357e134b8e16bb4d92"
};

function renderHistory(state: QueryState = {}, repositoryId = "repository_1") {
  queryState = state;

  return renderToStaticMarkup(
    <ScanHistory accessToken="access_token" repositoryId={repositoryId} />
  );
}

function renderContent(state: ScanQueryState, onPageChange = vi.fn()) {
  return ScanHistoryContent({
    accessToken: "access_token",
    data: state.data,
    error: state.error,
    isError: state.isError ?? false,
    isFetching: state.isFetching ?? false,
    isLoading: state.isLoading ?? false,
    onPageChange
  }) as ReactElement;
}

function findButtonElements(node: ReactNode): ReactElement<ButtonElementProps>[] {
  if (!node || typeof node !== "object" || !("type" in node) || !("props" in node)) {
    return [];
  }

  const element = node as ReactElement<ButtonElementProps>;
  const matches = element.type === Button ? [element] : [];
  const children = element.props.children;
  const childList = Array.isArray(children) ? children : [children];

  return childList.reduce<ReactElement<ButtonElementProps>[]>(
    (found, child) => found.concat(findButtonElements(child)),
    matches
  );
}

describe("ScanHistory", () => {
  beforeEach(() => {
    queryOptions.length = 0;
    queryState = {};
    vi.mocked(getScanHistory).mockReset();
    vi.mocked(getScanLimits).mockReset();
    vi.mocked(startAnalysis).mockReset();
  });

  it("renders the scan history component", () => {
    const markup = renderHistory({ data: historyResponse([]) });

    expect(markup).toContain("Project activity");
  });

  it("uses the repository id and authenticated access token for history requests", async () => {
    vi.mocked(getScanHistory).mockResolvedValue(historyResponse([completedScan]));
    renderHistory({ data: historyResponse([]) }, "repository_abc");

    await queryOptions[0]?.queryFn();

    expect(queryOptions[0]?.queryKey).toEqual(["scan-history", "repository_abc", 1, 20]);
    expect(queryOptions[0]?.enabled).toBe(true);
    expect(getScanHistory).toHaveBeenCalledWith("access_token", "repository_abc", 1, 20);
  });

  it("loads canonical scan limits for history usage summaries", async () => {
    vi.mocked(getScanLimits).mockResolvedValue(scanLimits);
    renderHistory({ data: historyResponse([completedScan]) }, "repository_abc");

    await queryOptions[1]?.queryFn();

    expect(queryOptions[1]?.queryKey).toEqual(["scan-limits"]);
    expect(queryOptions[1]?.enabled).toBe(true);
    expect(getScanLimits).toHaveBeenCalledWith("access_token");
  });

  it("does not load per-scan analysis history for completed scans", () => {
    renderHistory({ data: historyResponse([completedScan]) }, "repository_abc");

    expect(queryOptions.map((options) => options.queryKey[0])).not.toContain("analysis-history");
  });

  it("scopes the query key by repository id", () => {
    renderHistory({ data: historyResponse([]) }, "repository_a");
    renderHistory({ data: historyResponse([]) }, "repository_b");

    const historyKeys = queryOptions
      .filter((options) => options.queryKey[0] === "scan-history")
      .map((options) => options.queryKey);

    expect(historyKeys[0]).toContain("repository_a");
    expect(historyKeys[1]).toContain("repository_b");
  });

  it("shows a loading state while history is loading", () => {
    const markup = renderHistory({ isLoading: true });

    expect(markup).toContain("Loading project activity");
  });

  it("renders backend scan history items without reordering or recalculating values", () => {
    const markup = renderHistory({
      data: historyResponse([completedScan, failedScan])
    });

    expect(markup.indexOf("fffed9f5ecab4ebb9a861f357e134b8e16bb4d92")).toBeLessThan(
      markup.indexOf("abc123failed")
    );
    expect(markup).toContain("Completed");
    expect(markup).toContain("Failed");
    expect(markup).toContain("91");
    expect(markup).toContain("563302 bytes");
    expect(markup).toContain("91 / 5,000");
    expect(markup).toContain("563,302 bytes / 25 MiB");
    expect(markup).toContain("6864 ms");
    expect(markup).toContain("98765432101234567890 bytes");
    expect(markup).toContain("Not available");
    expect(markup).toContain("Analyze scan scan_completed");
    expect(markup).not.toContain("Analyze scan_failed");
  });

  it("shows meaningful scan-limit failures in scan history", () => {
    const markup = renderHistory({
      data: historyResponse([
        {
          ...failedScan,
          limit: {
            reached: true,
            reason: "TOTAL_SIZE_LIMIT"
          },
          usage: {
            filesProcessed: 488,
            totalBytesConsidered: "26214401"
          }
        }
      ])
    });

    expect(markup).toContain("Total data limit reached");
    expect(markup).toContain("488 / 5,000");
    expect(markup).toContain("25 MiB / 25 MiB");
  });

  it("shows Analyze scan when a completed scan has no analyses", () => {
    const markup = renderHistory({
      data: historyResponse([completedScan])
    });

    expect(markup).toContain("Ready for analysis");
    expect(markup).toContain("Analyze scan scan_completed");
    expect(markup).not.toContain("View analysis");
  });

  it("shows View analysis and Analyze again when a completed scan has analyses", () => {
    const markup = renderHistory({
      data: historyResponse([{ ...completedScan, latestAnalysis }])
    });

    expect(markup).toContain("Analysis");
    expect(markup).toContain("View analysis");
    expect(markup).toContain("/analyses/analysis_latest");
    expect(markup).toContain("Analyze again scan_completed");
    expect(markup).toContain("analysis-engine-4.13");
    expect(markup).not.toContain("analysis_older");
  });

  it("uses the embedded latest analysis as the View analysis target", () => {
    const markup = renderHistory({
      data: historyResponse([{ ...completedScan, latestAnalysis }])
    });

    expect(markup).toContain("/analyses/analysis_latest");
  });

  it("does not call POST when rendering or viewing existing analyses", () => {
    renderHistory({
      data: historyResponse([{ ...completedScan, latestAnalysis }])
    });

    expect(startAnalysis).not.toHaveBeenCalled();
  });

  it("renders an empty state when the backend returns no history items", () => {
    const markup = renderHistory({
      data: historyResponse([], 1, 0)
    });

    expect(markup).toContain("No scans yet");
  });

  it("renders a safe error message without credential details", () => {
    const markup = renderHistory({
      error: new ScanApiRequestError("Authorization Bearer secret-token", 500),
      isError: true
    });

    expect(markup).toContain("Scan history could not be loaded.");
    expect(markup).not.toContain("secret-token");
    expect(markup).not.toContain("Authorization");
    expect(markup).not.toContain("Bearer");
  });

  it("does not render credential-shaped values from history responses", () => {
    const markup = renderHistory({
      data: historyResponse([completedScan])
    });

    expect(markup).not.toContain("accessToken");
    expect(markup).not.toContain("refreshToken");
    expect(markup).not.toContain("bearerToken");
    expect(markup).not.toContain("authorization");
    expect(markup).not.toContain("credential");
  });

  it("renders pagination from backend metadata", () => {
    const markup = renderHistory({
      data: historyResponse([completedScan], 2, 3)
    });

    expect(markup).toContain("Page 2 of 3");
  });

  it("requests next and previous pages through backend pagination controls", () => {
    const onPageChange = vi.fn();
    const element = renderContent(
      {
        data: historyResponse([completedScan], 2, 3)
      },
      onPageChange
    );
    const buttons = findButtonElements(element);

    const paginationButtons = buttons.slice(-2);

    expect(paginationButtons[0]?.props.disabled).toBe(false);
    expect(paginationButtons[1]?.props.disabled).toBe(false);

    paginationButtons[0]?.props.onClick?.();
    paginationButtons[1]?.props.onClick?.();

    expect(onPageChange).toHaveBeenCalledWith(1);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("disables previous on the first page and next on the last page", () => {
    const firstPageButtons = findButtonElements(
      renderContent({
        data: historyResponse([completedScan], 1, 3)
      })
    );
    const lastPageButtons = findButtonElements(
      renderContent({
        data: historyResponse([completedScan], 3, 3)
      })
    );

    expect(firstPageButtons[0]?.props.disabled).toBe(true);
    expect(firstPageButtons[1]?.props.disabled).toBe(false);
    expect(lastPageButtons[0]?.props.disabled).toBe(false);
    expect(lastPageButtons[1]?.props.disabled).toBe(true);
  });
});
