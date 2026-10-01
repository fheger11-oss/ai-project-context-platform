import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ArchitectureComparisonResponse,
  ArchitectureHistoryResponse,
  ArchitectureSnapshotSummary
} from "@ai-context/contracts";

import {
  getArchitectureComparison,
  listArchitectureHistory
} from "@/features/architecture-history/api/architecture-history-api";
import {
  ArchitectureHistoryPanel,
  architectureComparisonQueryKey,
  architectureHistoryQueryKey
} from "@/features/architecture-history/components/architecture-history-panel";

type QueryOptions = {
  enabled?: boolean;
  queryFn: () => Promise<unknown>;
  queryKey: readonly unknown[];
};

type QueryState<T> = {
  data?: T;
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
};

const baseline: ArchitectureSnapshotSummary = {
  historyId: "history_old",
  projectContextId: "context_old",
  analysisId: "analysis_old",
  scanId: "scan_old",
  commitSha: "1111111111111111111111111111111111111111",
  promotedAt: "2026-09-29T12:00:00.000Z",
  generatedAt: "2026-09-29T11:00:00.000Z",
  contextVersion: "context-engine@5.7.1",
  analyzerVersion: "analysis-engine-4.10",
  hasPreviousSnapshot: false,
  adjacentCompatibility: "NO_BASELINE"
};

const target: ArchitectureSnapshotSummary = {
  ...baseline,
  historyId: "history_new",
  projectContextId: "context_new",
  commitSha: "2222222222222222222222222222222222222222",
  promotedAt: "2026-09-30T12:00:00.000Z",
  generatedAt: "2026-09-30T11:00:00.000Z",
  hasPreviousSnapshot: true,
  adjacentCompatibility: "COMPARABLE"
};

const comparable: ArchitectureComparisonResponse = {
  status: "COMPARABLE",
  baseline,
  target,
  addedModules: [{ moduleId: "module:src/api", name: "API", path: "src/api", confidence: "HIGH" }],
  removedModules: [
    { moduleId: "module:src/legacy", name: "Legacy", path: "src/legacy", confidence: "MEDIUM" }
  ],
  modifiedModules: [
    {
      module: { moduleId: "module:src/core", name: "Core", path: "src/core", confidence: "HIGH" },
      addedIncomingRelationships: [
        {
          sourceModuleId: "module:src/api",
          targetModuleId: "module:src/core",
          confidence: "HIGH"
        }
      ],
      removedIncomingRelationships: [],
      addedOutgoingRelationships: [
        {
          sourceModuleId: "module:src/core",
          targetModuleId: "module:src/database",
          confidence: "MEDIUM"
        }
      ],
      removedOutgoingRelationships: []
    }
  ],
  unchangedModuleCount: 4,
  addedRelationships: [
    {
      sourceModuleId: "module:src/api",
      targetModuleId: "module:src/database",
      confidence: "HIGH"
    }
  ],
  removedRelationships: [
    {
      sourceModuleId: "module:src/legacy",
      targetModuleId: "module:src/core",
      confidence: "MEDIUM"
    }
  ],
  unchangedRelationshipCount: 3,
  suppressedClaims: [{ identity: "module:src/uncertain", reason: "LOW_CONFIDENCE" }]
};

let historyState: QueryState<ArchitectureHistoryResponse>;
let comparisonState: QueryState<ArchitectureComparisonResponse>;
let queryOptions: QueryOptions[] = [];
const historyRefetch = vi.fn();
const comparisonRefetch = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: QueryOptions) => {
    queryOptions.push(options);
    const isComparison = options.queryKey.at(-1) === "comparison";
    return isComparison
      ? { ...comparisonState, refetch: comparisonRefetch }
      : { ...historyState, refetch: historyRefetch };
  }
}));

vi.mock("@/features/architecture-history/api/architecture-history-api", () => ({
  listArchitectureHistory: vi.fn(),
  getArchitectureComparison: vi.fn()
}));

function render(repositoryId = "repository_1", accessToken = "access_token") {
  return renderToStaticMarkup(
    <MemoryRouter>
      <ArchitectureHistoryPanel accessToken={accessToken} repositoryId={repositoryId} />
    </MemoryRouter>
  );
}

describe("ArchitectureHistoryPanel", () => {
  beforeEach(() => {
    queryOptions = [];
    historyState = {
      data: { items: [target, baseline] },
      isError: false,
      isFetching: false,
      isLoading: false
    };
    comparisonState = {
      data: comparable,
      isError: false,
      isFetching: false,
      isLoading: false
    };
    historyRefetch.mockReset();
    comparisonRefetch.mockReset();
    vi.mocked(listArchitectureHistory).mockReset();
    vi.mocked(getArchitectureComparison).mockReset();
  });

  it("uses repository-scoped history and selected-target comparison queries", async () => {
    const markup = render();

    expect(queryOptions[0]?.queryKey).toEqual(architectureHistoryQueryKey("repository_1"));
    expect(queryOptions[1]?.queryKey).toEqual(
      architectureComparisonQueryKey("repository_1", "history_new")
    );
    expect(queryOptions[1]?.enabled).toBe(true);
    expect(markup).toMatch(/value="history_new" selected=""/);

    await queryOptions[0]?.queryFn();
    await queryOptions[1]?.queryFn();
    expect(listArchitectureHistory).toHaveBeenCalledWith("access_token", "repository_1");
    expect(getArchitectureComparison).toHaveBeenCalledWith(
      "access_token",
      "repository_1",
      "history_new"
    );
  });

  it("keeps query keys isolated when repositories change", () => {
    render("repository_a");
    const keysA = queryOptions.map((option) => option.queryKey);
    queryOptions = [];
    render("repository_b");
    const keysB = queryOptions.map((option) => option.queryKey);

    expect(keysA.every((key) => key[1] === "repository_a")).toBe(true);
    expect(keysB.every((key) => key[1] === "repository_b")).toBe(true);
  });

  it("renders history loading, empty, and error states with request-local retry", () => {
    historyState = { isError: false, isFetching: false, isLoading: true };
    expect(render()).toContain("Loading architecture history");

    historyState = {
      data: { items: [] },
      isError: false,
      isFetching: false,
      isLoading: false
    };
    expect(render()).toContain("No architecture history available");

    historyState = { isError: true, isFetching: false, isLoading: false };
    const markup = render();
    expect(markup).toContain("Architecture history unavailable");
    expect(markup).toContain("Retry");
  });

  it("shows one snapshot intentionally and does not request a comparison", () => {
    historyState = {
      data: { items: [baseline] },
      isError: false,
      isFetching: false,
      isLoading: false
    };
    const markup = render();

    expect(markup).toContain("No previous durable snapshot");
    expect(markup).toContain("earliest available durable architecture snapshot");
    expect(queryOptions[1]?.enabled).toBe(false);
  });

  it("renders all comparable structural sections, direction, confidence, and suppression", () => {
    const markup = render();

    expect(markup).toContain("Added modules");
    expect(markup).toContain("Removed modules");
    expect(markup).toContain("Modified modules");
    expect(markup).toContain("Added relationships");
    expect(markup).toContain("Removed relationships");
    expect(markup).toContain("src/api → src/database");
    expect(markup).toContain("HIGH confidence · Inferred");
    expect(markup).toContain("Unchanged modules");
    expect(markup).toContain(">4<");
    expect(markup).toContain("Suppressed claims (1)");
  });

  it("renders the incompatible safeguard without structural changes", () => {
    comparisonState.data = {
      status: "INCOMPATIBLE",
      baseline,
      target: { ...target, analyzerVersion: "analysis-engine-5.0" }
    };
    const markup = render();

    expect(markup).toContain("Snapshots are not compatible");
    expect(markup).toContain("Compatibility safeguard");
    expect(markup).not.toContain("Added modules");
  });

  it("renders incomplete diagnostics without an authoritative diff", () => {
    comparisonState.data = {
      status: "INCOMPLETE",
      baseline,
      target,
      diagnostics: [{ code: "ORPHAN_RELATIONSHIP", message: "An endpoint is unavailable." }],
      suppressedClaims: [{ identity: "module:src/low", reason: "LOW_CONFIDENCE" }]
    };
    const markup = render();

    expect(markup).toContain("Architecture history could not be compared safely");
    expect(markup).toContain("ORPHAN_RELATIONSHIP");
    expect(markup).not.toContain("Added modules");
  });

  it("renders backend NO_BASELINE and empty structural comparison states", () => {
    comparisonState.data = { status: "NO_BASELINE", baseline: null, target: baseline };
    expect(render()).toContain("No previous durable snapshot");

    comparisonState.data = {
      ...comparable,
      addedModules: [],
      removedModules: [],
      modifiedModules: [],
      addedRelationships: [],
      removedRelationships: [],
      suppressedClaims: []
    };
    expect(render()).toContain("No structural architecture changes detected");
  });

  it("replaces stale comparison content with loading and supports comparison retry", () => {
    comparisonState = { isError: false, isFetching: true, isLoading: false, data: comparable };
    const loadingMarkup = render();
    expect(loadingMarkup).toContain("Loading architecture comparison");
    expect(loadingMarkup).not.toContain("Added modules");

    comparisonState = { isError: true, isFetching: false, isLoading: false };
    const errorMarkup = render();
    expect(errorMarkup).toContain("Architecture comparison unavailable");
    expect(errorMarkup).toContain("Retry");
  });
});
