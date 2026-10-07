import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  DependencyIntelligenceHistoryResponse,
  DependencyIntelligenceResponse
} from "@ai-context/contracts";

import {
  DependencyIntelligencePanel,
  dependencyIntelligenceQueryKey
} from "./dependency-intelligence-panel";

let current: { data?: DependencyIntelligenceResponse; isLoading: boolean; isError: boolean };
let history: { data?: DependencyIntelligenceHistoryResponse; isLoading: boolean; isError: boolean };
vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: { queryKey: readonly unknown[] }) => ({
    ...(JSON.stringify(options.queryKey).includes("history") ? history : current),
    refetch: vi.fn()
  })
}));
vi.mock("../api/dependency-intelligence-api", () => ({
  getDependencyIntelligence: vi.fn(),
  getDependencyIntelligenceHistory: vi.fn()
}));

describe("DependencyIntelligencePanel", () => {
  beforeEach(() => {
    current = { isLoading: false, isError: false };
    history = { isLoading: false, isError: false };
  });

  it("uses repository-scoped query keys", () => {
    expect(dependencyIntelligenceQueryKey("repository-a", { page: 1 })).not.toEqual(
      dependencyIntelligenceQueryKey("repository-b", { page: 1 })
    );
  });

  it("renders loading, error, and no-current-context states", () => {
    current = { isLoading: true, isError: false };
    expect(render()).toContain("Loading Dependency Intelligence");
    current = { isLoading: false, isError: true };
    expect(render()).toContain("Dependency Intelligence unavailable");
    current = { data: emptyCurrent(), isLoading: false, isError: false };
    expect(render()).toContain("No current promoted context");
  });

  it("renders factual findings, declarations, provenance, and compatible history", () => {
    current = { data: populatedCurrent(), isLoading: false, isError: false };
    history = { data: populatedHistory("COMPARABLE"), isLoading: false, isError: false };
    const markup = render();
    expect(markup).toContain("Declaration divergence findings");
    expect(markup).toContain("different exact declared version specifications");
    expect(markup).toContain("apps/web/package.json");
    expect(markup).toContain("Dependency declarations");
    expect(markup).toContain("Historical comparison");
    expect(markup).toContain("version changed");
    expect(markup).not.toContain("vulnerable");
    expect(markup).not.toContain("health score");
  });

  it("renders empty findings, no-baseline, and incompatible comparison states", () => {
    current = {
      data: { ...populatedCurrent(), findings: paged([]) },
      isLoading: false,
      isError: false
    };
    history = { data: populatedHistory("NO_BASELINE"), isLoading: false, isError: false };
    expect(render()).toContain("No declaration divergences were found");
    expect(render()).toContain("No historical baseline");
    history = { data: populatedHistory("INCOMPATIBLE"), isLoading: false, isError: false };
    expect(render()).toContain("Incompatible historical baseline");
  });
});

function render() {
  return renderToStaticMarkup(
    <DependencyIntelligencePanel accessToken="token" repositoryId="repository-a" />
  );
}

function emptyCurrent(): DependencyIntelligenceResponse {
  return {
    available: false,
    provenance: null,
    compatibility: null,
    summary: null,
    declarations: paged([]),
    findings: paged([])
  };
}

function populatedCurrent(): DependencyIntelligenceResponse {
  const provenance = {
    repositoryId: "repository-a",
    projectContextId: "context-current",
    analysisId: "analysis-current",
    commitSha: "abcdef123",
    analyzerVersion: "analyzer-1",
    contextVersion: "context-1",
    dependencyProcessorVersion: "dependency-processor-1.0"
  };
  const evidence = [
    {
      packageName: "react",
      declaredVersion: "^18",
      dependencyType: "DEPENDENCY" as const,
      manifestPath: "package.json",
      projectContextId: "context-current",
      analysisId: "analysis-current",
      commitSha: "abcdef123"
    },
    {
      packageName: "react",
      declaredVersion: "^19",
      dependencyType: "DEPENDENCY" as const,
      manifestPath: "apps/web/package.json",
      projectContextId: "context-current",
      analysisId: "analysis-current",
      commitSha: "abcdef123"
    }
  ];
  return {
    available: true,
    provenance,
    compatibility: "COMPARABLE",
    summary: { declarationCount: 2, distinctPackageCount: 1, divergenceFindingCount: 1 },
    declarations: paged(
      evidence.map(({ projectContextId: _p, analysisId: _a, commitSha: _c, ...item }) => item)
    ),
    findings: paged([
      {
        ruleId: "dependency.declaration-divergence",
        ruleVersion: "1.0",
        fingerprint: "fp",
        packageName: "react",
        lifecycle: "NEW",
        projectContextId: "context-current",
        analysisId: "analysis-current",
        commitSha: "abcdef123",
        evidence
      }
    ])
  };
}

function populatedHistory(
  status: "COMPARABLE" | "NO_BASELINE" | "INCOMPATIBLE"
): DependencyIntelligenceHistoryResponse {
  return {
    available: true,
    compatibility: status,
    current: populatedCurrent().provenance,
    previous:
      status === "NO_BASELINE"
        ? null
        : {
            ...populatedCurrent().provenance!,
            projectContextId: "context-previous",
            commitSha: "previous"
          },
    lifecycleCounts: { new: 1, persisting: 0, resolved: 0, recurring: 0 },
    changeCounts: { added: 0, removed: 0, versionChanged: 1, dependencyTypeChanged: 0 },
    findings: populatedCurrent().findings,
    changes: paged([
      {
        type: "VERSION_CHANGED",
        manifestPath: "package.json",
        packageName: "react",
        previousVersion: "^18",
        currentVersion: "^19",
        previousDependencyType: "DEPENDENCY",
        currentDependencyType: "DEPENDENCY"
      }
    ])
  };
}

function paged<T>(items: T[]) {
  return { items, pagination: { page: 1, pageSize: 20, total: items.length, hasNextPage: false } };
}
