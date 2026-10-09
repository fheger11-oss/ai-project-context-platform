import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ArchitectureIntelligenceResponse } from "@ai-context/contracts";

import {
  ArchitectureIntelligencePanel,
  architectureIntelligenceQueryKey
} from "./architecture-intelligence-panel";

let current: {
  data?: ArchitectureIntelligenceResponse;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
};
vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({ isPending: false, isError: false, mutate: vi.fn() }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: (options: { queryKey: readonly unknown[] }) =>
    options.queryKey.includes("history")
      ? { data: undefined, isLoading: false, isError: false, isFetching: false }
      : { ...current, refetch: vi.fn() }
}));
vi.mock("../api/architecture-intelligence-api", () => ({
  getArchitectureIntelligence: vi.fn(),
  getArchitectureIntelligenceHistory: vi.fn(),
  reprocessArchitectureIntelligence: vi.fn()
}));

describe("ArchitectureIntelligencePanel", () => {
  beforeEach(() => {
    current = { isLoading: false, isError: false, isFetching: false };
  });

  it("uses repository-scoped query keys", () => {
    expect(architectureIntelligenceQueryKey("repository-a", { page: 1 })).not.toEqual(
      architectureIntelligenceQueryKey("repository-b", { page: 1 })
    );
  });

  it("renders loading, pending, failed, and incompatible states", () => {
    current = { isLoading: true, isError: false, isFetching: false };
    expect(render()).toContain("Loading Architecture Intelligence");
    current = {
      data: { processing: null, intelligence: null },
      isLoading: false,
      isError: false,
      isFetching: false
    };
    expect(render()).toContain("has not started");
    current = { data: response("FAILED"), isLoading: false, isError: false, isFetching: false };
    expect(render()).toContain("Processing failed");
    current = {
      data: response("INCOMPATIBLE"),
      isLoading: false,
      isError: false,
      isFetching: false
    };
    expect(render()).toContain("Processing incompatible");
    expect(render()).toContain("Reprocess current commit");
    current = { isLoading: false, isError: true, isFetching: false };
    expect(render()).toContain("Architecture Intelligence unavailable");
  });

  it("renders the canonical overview, module inventory, dependencies, and finding evidence", () => {
    current = { data: completedResponse(), isLoading: false, isError: false, isFetching: false };
    const markup = render();
    expect(markup).toContain("Modules</div>");
    expect(markup).toContain("Dependencies</div>");
    expect(markup).toContain("Findings</div>");
    expect(markup).toMatch(/>3<\/div><div[^>]*>Modules<\/div>/);
    expect(markup).toMatch(/>2<\/div><div[^>]*>Dependencies<\/div>/);
    expect(markup).toMatch(/>1<\/div><div[^>]*>Findings<\/div>/);
    expect(markup).toContain("apps/api/src/modules/a");
    expect(markup).toContain("BACKEND_FEATURE");
    expect(markup).toContain("APPLICATION");
    expect(markup).toContain("A (module:a) → B (module:b)");
    expect(markup).toContain("IMPORTS");
    expect(markup).toContain("Circular dependencies");
    expect(markup).toContain("Modules in cycle");
    expect(markup).toContain("A (module:a) → B (module:b) → C (module:c) → A (module:a)");
    expect(markup).toContain("APPLICABLE");
    expect(markup).toContain("dependency:a-b");
    expect(markup).toContain("relationship:1");
    expect(markup).toContain("Inspect evidence");
    expect(markup).toContain("Module measurements");
    expect(markup).toContain("Added modules");
    expect(markup).toContain("Finding filters");
    expect(markup).toContain("/repositories/repository_1/architecture-history");
  });

  it("shows the factual no-findings state without a health claim", () => {
    const data = completedResponse();
    data.intelligence!.summary.circularDependencyFindingCount = 0;
    data.intelligence!.findings.items = [];
    current = { data, isLoading: false, isError: false, isFetching: false };
    const markup = render();
    expect(markup).toContain("No architecture findings detected.");
    expect(markup).not.toContain("architecture is healthy");
  });

  it("preserves partially applicable findings as coverage information", () => {
    const data = completedResponse();
    data.intelligence!.findings.items[0]!.applicability = "PARTIALLY_APPLICABLE";
    current = { data, isLoading: false, isError: false, isFetching: false };
    const markup = render();
    expect(markup).toContain("PARTIALLY_APPLICABLE");
    expect(markup).toContain("unresolved source relationships");
  });
});

function render() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <ArchitectureIntelligencePanel accessToken="token" repositoryId="repository_1" />
    </MemoryRouter>
  );
}

function response(status: "FAILED" | "INCOMPATIBLE"): ArchitectureIntelligenceResponse {
  return {
    processing: {
      status,
      projectContextId: "context-1",
      commitSha: "abc",
      processorVersion: "processor-1",
      analyzerVersion: "analyzer-1",
      contextVersion: "context-1",
      startedAt: null,
      completedAt: null,
      failureCategory: status === "FAILED" ? "PROCESSOR_FAILURE" : null,
      attemptCount: 1,
      nextAttemptAt: "2026-10-05T12:01:00.000Z"
    },
    intelligence: null
  };
}

function completedResponse(): ArchitectureIntelligenceResponse {
  return {
    processing: {
      status: "COMPLETED",
      projectContextId: "context-1",
      commitSha: "abcdef123",
      processorVersion: "processor-1",
      analyzerVersion: "analyzer-1",
      contextVersion: "context-1",
      startedAt: null,
      completedAt: "2026-10-05T12:00:00.000Z",
      failureCategory: null,
      attemptCount: 1,
      nextAttemptAt: "2026-10-05T12:00:00.000Z"
    },
    intelligence: {
      compatibility: "COMPARABLE",
      architectureModel: {
        modules: [
          architectureModule("module:a", "A", "apps/api/src/modules/a"),
          architectureModule("module:b", "B", "apps/api/src/modules/b"),
          architectureModule("module:c", "C", "apps/api/src/modules/c")
        ],
        dependencies: [
          architectureDependency("dependency:a-b", "module:a", "module:b"),
          architectureDependency("dependency:b-c", "module:b", "module:c")
        ],
        publicSurfaces: []
      },
      summary: {
        moduleCount: 2,
        relationshipCount: 2,
        circularDependencyFindingCount: 1,
        addedModuleCount: 1,
        removedModuleCount: 0,
        addedRelationshipCount: 1,
        removedRelationshipCount: 0
      },
      findings: {
        items: [
          {
            occurrenceId: "occurrence-1",
            projectContextId: "context-1",
            fingerprint: "fingerprint",
            ruleId: "architecture.circular-dependency",
            ruleVersion: "1.0",
            applicability: "APPLICABLE",
            confidence: "HIGH",
            lifecycle: "NEW",
            subject: { kind: "CYCLE", moduleIds: ["module:a", "module:b", "module:c"] },
            evidence: [
              {
                kind: "CANONICAL_ARCHITECTURE_DEPENDENCIES",
                dependencyIds: ["dependency:a-b", "dependency:b-c"],
                relationshipIds: ["relationship:1", "relationship:2"]
              }
            ],
            createdAt: "2026-10-05T12:00:00.000Z"
          }
        ],
        pagination: { page: 1, pageSize: 20, total: 1, hasNextPage: false }
      },
      modules: {
        items: [
          {
            moduleId: "module:a",
            path: "a",
            confidence: "HIGH",
            sourceFileCount: 1,
            declarationCount: 2,
            fanIn: 1,
            fanOut: 1,
            totalDegree: 2,
            relationshipCount: 1
          }
        ],
        pagination: { page: 1, pageSize: 20, total: 1, hasNextPage: false }
      },
      changes: {
        addedModules: ["module:a"],
        removedModules: [],
        addedRelationships: [{ sourceModuleId: "module:a", targetModuleId: "module:b" }],
        removedRelationships: []
      }
    }
  };
}

function architectureModule(id: string, name: string, rootPath: string) {
  return {
    id,
    kind: "BACKEND_FEATURE" as const,
    name,
    rootPath,
    packageId: "package:api",
    parentModuleId: "package:api",
    fileIds: [`file:${name.toLowerCase()}`],
    layers: [{ kind: "APPLICATION" as const, fileIds: [`file:${name.toLowerCase()}`] }],
    sourceExports: [],
    frameworkSignals: [],
    inference: "INFERRED" as const,
    confidence: "MEDIUM" as const,
    evidence: []
  };
}

function architectureDependency(id: string, sourceModuleId: string, targetModuleId: string) {
  return {
    id,
    sourceModuleId,
    targetModuleId,
    relationshipCount: 1,
    sourceFileCount: 1,
    targetFileCount: 1,
    relationshipKinds: ["IMPORTS" as const],
    relationshipIds: [`relationship:${id}`],
    resolution: "RESOLVED" as const
  };
}
