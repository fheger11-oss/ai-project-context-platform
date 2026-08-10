import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/button";
import type { ScanHistoryResponse, ScanSnapshot } from "@/features/scans/api/scan-api";
import { getScanHistory, ScanApiRequestError } from "@/features/scans/api/scan-api";
import { ScanHistory, ScanHistoryContent } from "./scan-history";

type QueryOptions = {
  enabled?: boolean;
  queryFn: () => Promise<unknown>;
  queryKey: readonly unknown[];
};

type QueryState = {
  data?: ScanHistoryResponse;
  error?: unknown;
  isError?: boolean;
  isFetching?: boolean;
  isLoading?: boolean;
};

type ButtonElementProps = {
  children?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
};

const queryOptions: QueryOptions[] = [];
let queryState: QueryState = {};

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: QueryOptions) => {
    queryOptions.push(options);

    return {
      data: queryState.data,
      error: queryState.error,
      isError: queryState.isError ?? false,
      isFetching: queryState.isFetching ?? false,
      isLoading: queryState.isLoading ?? false
    };
  }
}));

vi.mock("@/features/scans/api/scan-api", async (importOriginal) => {
  const actual = (await importOriginal()) as object;

  return {
    ...actual,
    getScanHistory: vi.fn()
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
  totalSize: "98765432101234567890"
};

function historyResponse(items: ScanSnapshot[], page = 1, totalPages = 1): ScanHistoryResponse {
  return {
    items,
    pagination: {
      page,
      pageSize: 20,
      totalItems: items.length,
      totalPages
    }
  };
}

function renderHistory(state: QueryState = {}, repositoryId = "repository_1") {
  queryState = state;

  return renderToStaticMarkup(
    <ScanHistory accessToken="access_token" repositoryId={repositoryId} />
  );
}

function renderContent(state: QueryState, onPageChange = vi.fn()) {
  return ScanHistoryContent({
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
  });

  it("renders the scan history component", () => {
    const markup = renderHistory({ data: historyResponse([]) });

    expect(markup).toContain("Scan History");
  });

  it("uses the repository id and authenticated access token for history requests", async () => {
    vi.mocked(getScanHistory).mockResolvedValue(historyResponse([completedScan]));
    renderHistory({ data: historyResponse([]) }, "repository_abc");

    await queryOptions[0]?.queryFn();

    expect(queryOptions[0]?.queryKey).toEqual(["scan-history", "repository_abc", 1, 20]);
    expect(queryOptions[0]?.enabled).toBe(true);
    expect(getScanHistory).toHaveBeenCalledWith("access_token", "repository_abc", 1, 20);
  });

  it("scopes the query key by repository id", () => {
    renderHistory({ data: historyResponse([]) }, "repository_a");
    renderHistory({ data: historyResponse([]) }, "repository_b");

    expect(queryOptions[0]?.queryKey).toContain("repository_a");
    expect(queryOptions[1]?.queryKey).toContain("repository_b");
  });

  it("shows a loading state while history is loading", () => {
    const markup = renderHistory({ isLoading: true });

    expect(markup).toContain("Loading scan history.");
  });

  it("renders backend scan history items without reordering or recalculating values", () => {
    const markup = renderHistory({
      data: historyResponse([completedScan, failedScan])
    });

    expect(markup.indexOf("fffed9f5ecab4ebb9a861f357e134b8e16bb4d92")).toBeLessThan(
      markup.indexOf("abc123failed")
    );
    expect(markup).toContain("COMPLETED");
    expect(markup).toContain("FAILED");
    expect(markup).toContain("91");
    expect(markup).toContain("563302 bytes");
    expect(markup).toContain("6864 ms");
    expect(markup).toContain("98765432101234567890 bytes");
    expect(markup).toContain("Not available");
  });

  it("renders an empty state when the backend returns no history items", () => {
    const markup = renderHistory({
      data: historyResponse([], 1, 0)
    });

    expect(markup).toContain("No scans yet.");
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
      data: {
        items: [completedScan],
        pagination: {
          page: 2,
          pageSize: 20,
          totalItems: 41,
          totalPages: 3
        }
      }
    });

    expect(markup).toContain("Page 2 of 3");
  });

  it("requests next and previous pages through backend pagination controls", () => {
    const onPageChange = vi.fn();
    const element = renderContent(
      {
        data: {
          items: [completedScan],
          pagination: {
            page: 2,
            pageSize: 20,
            totalItems: 41,
            totalPages: 3
          }
        }
      },
      onPageChange
    );
    const buttons = findButtonElements(element);

    expect(buttons[0]?.props.disabled).toBe(false);
    expect(buttons[1]?.props.disabled).toBe(false);

    buttons[0]?.props.onClick?.();
    buttons[1]?.props.onClick?.();

    expect(onPageChange).toHaveBeenCalledWith(1);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("disables previous on the first page and next on the last page", () => {
    const firstPageButtons = findButtonElements(
      renderContent({
        data: {
          items: [completedScan],
          pagination: {
            page: 1,
            pageSize: 20,
            totalItems: 41,
            totalPages: 3
          }
        }
      })
    );
    const lastPageButtons = findButtonElements(
      renderContent({
        data: {
          items: [completedScan],
          pagination: {
            page: 3,
            pageSize: 20,
            totalItems: 41,
            totalPages: 3
          }
        }
      })
    );

    expect(firstPageButtons[0]?.props.disabled).toBe(true);
    expect(firstPageButtons[1]?.props.disabled).toBe(false);
    expect(lastPageButtons[0]?.props.disabled).toBe(false);
    expect(lastPageButtons[1]?.props.disabled).toBe(true);
  });
});
