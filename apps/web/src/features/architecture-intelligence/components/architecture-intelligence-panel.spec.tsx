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
  useQuery: (options: { queryKey: readonly unknown[] }) =>
    options.queryKey.includes("history")
      ? { data: undefined, isLoading: false, isError: false, isFetching: false }
      : { ...current, refetch: vi.fn() }
}));
vi.mock("../api/architecture-intelligence-api", () => ({
  getArchitectureIntelligence: vi.fn(),
  getArchitectureIntelligenceHistory: vi.fn()
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
  });

  it("renders findings, evidence, measurements, changes, filters, and history navigation", () => {
    current = { data: completedResponse(), isLoading: false, isError: false, isFetching: false };
    const markup = render();
    expect(markup).toContain("Circular dependencies");
    expect(markup).toContain("Modules in cycle");
    expect(markup).toContain("module:a, module:b, module:c");
    expect(markup).not.toContain("module:a → module:b → module:c");
    expect(markup).toContain("module:a → module:b");
    expect(markup).toContain("Inspect evidence");
    expect(markup).toContain("Module measurements");
    expect(markup).toContain("Added modules");
    expect(markup).toContain("Finding filters");
    expect(markup).toContain("/repositories/repository_1/architecture-history");
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
            applicability: null,
            confidence: "HIGH",
            lifecycle: "NEW",
            subject: { kind: "CYCLE", moduleIds: ["module:a", "module:b", "module:c"] },
            evidence: [
              {
                kind: "MODULE_RELATIONSHIP",
                sourceModuleId: "module:a",
                targetModuleId: "module:b",
                relationshipCount: 1,
                confidence: "HIGH"
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
