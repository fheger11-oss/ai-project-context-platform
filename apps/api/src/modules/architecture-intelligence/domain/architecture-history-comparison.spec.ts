import { describe, expect, it } from "vitest";

import {
  architectureResultsAreCompatible,
  compareArchitectureHistory,
  type ArchitectureCompatibility,
  type ArchitectureHistoricalSnapshot
} from "./architecture-history-comparison.js";
import type { ArchitectureGraph, ArchitectureGraphEdge } from "./architecture-graph.js";

const compatibility: ArchitectureCompatibility = {
  analyzerVersion: "analysis-1",
  contextVersion: "context-1",
  processorVersion: "processor-1",
  ruleId: "architecture.circular-dependency",
  ruleVersion: "1.0"
};

describe("architectureResultsAreCompatible", () => {
  it("requires all five compatibility components", () => {
    expect(architectureResultsAreCompatible(compatibility, { ...compatibility })).toBe(true);
    for (const [key, value] of [
      ["analyzerVersion", "analysis-2"],
      ["contextVersion", "context-2"],
      ["processorVersion", "processor-2"],
      ["ruleId", "architecture.other"],
      ["ruleVersion", "2.0"]
    ] as const) {
      expect(
        architectureResultsAreCompatible(compatibility, { ...compatibility, [key]: value })
      ).toBe(false);
    }
  });
});

describe("compareArchitectureHistory finding lifecycle", () => {
  it("derives NEW, PERSISTING, and RESOLVED without synthetic current occurrences", () => {
    const result = compareArchitectureHistory(
      snapshot("current", [occurrence("new", "current-new"), occurrence("same", "current-same")]),
      snapshot("previous", [
        occurrence("resolved", "previous-resolved"),
        occurrence("same", "previous-same")
      ])
    );
    expect(result).toMatchObject({
      status: "COMPARABLE",
      lifecycle: [
        { lifecycle: "NEW", fingerprint: "new", currentOccurrenceId: "current-new" },
        {
          lifecycle: "RESOLVED",
          fingerprint: "resolved",
          previousOccurrenceId: "previous-resolved"
        },
        {
          lifecycle: "PERSISTING",
          fingerprint: "same",
          currentOccurrenceId: "current-same",
          previousOccurrenceId: "previous-same"
        }
      ]
    });
    if (result.status === "COMPARABLE") {
      expect(result.lifecycle[1]).not.toHaveProperty("currentOccurrenceId");
    }
  });

  it("derives RECURRING only after a compatible intervening absence", () => {
    const recurring = compareArchitectureHistory(
      snapshot("current", [occurrence("cycle", "current")]),
      snapshot("previous", []),
      [snapshot("older", [occurrence("cycle", "older")])]
    );
    const notRecurring = compareArchitectureHistory(
      snapshot("current", [occurrence("cycle", "current")]),
      snapshot("previous", [])
    );
    expect(recurring).toMatchObject({
      status: "COMPARABLE",
      lifecycle: [{ lifecycle: "RECURRING", fingerprint: "cycle" }]
    });
    expect(notRecurring).toMatchObject({
      status: "COMPARABLE",
      lifecycle: [{ lifecycle: "NEW", fingerprint: "cycle" }]
    });
  });

  it("resets recurrence history at an incompatible boundary", () => {
    const result = compareArchitectureHistory(
      snapshot("current", [occurrence("cycle", "current")]),
      snapshot("previous", []),
      [
        snapshot("boundary", [occurrence("cycle", "boundary")], emptyGraph(), {
          contextVersion: "context-2"
        }),
        snapshot("older", [occurrence("cycle", "older")])
      ]
    );
    expect(result).toMatchObject({
      status: "COMPARABLE",
      lifecycle: [{ lifecycle: "NEW", fingerprint: "cycle" }]
    });
  });

  it("emits no transition for an occurrence absent in both adjacent snapshots", () => {
    expect(
      compareArchitectureHistory(snapshot("current", []), snapshot("previous", []))
    ).toMatchObject({ status: "COMPARABLE", lifecycle: [] });
  });

  it("does not derive lifecycle without a compatible adjacent baseline", () => {
    expect(compareArchitectureHistory(snapshot("current", []), null)).toEqual({
      status: "NO_BASELINE"
    });
    expect(
      compareArchitectureHistory(
        snapshot("current", []),
        snapshot("previous", [], emptyGraph(), { analyzerVersion: "analysis-2" })
      )
    ).toEqual({ status: "INCOMPATIBLE" });
  });
});

describe("compareArchitectureHistory structural signals", () => {
  it("derives sorted module additions/removals and treats a move as remove plus add", () => {
    const result = compareArchitectureHistory(
      snapshot("current", [], graph(["module:src/c", "module:src/moved"])),
      snapshot("previous", [], graph(["module:src/z", "module:src/original"]))
    );
    expect(result).toMatchObject({
      status: "COMPARABLE",
      addedModules: ["module:src/c", "module:src/moved"],
      removedModules: ["module:src/original", "module:src/z"]
    });
  });

  it("compares directed relationship existence, not relationship count", () => {
    const current = graph(
      ["module:a", "module:b", "module:c"],
      [edge("module:a", "module:b", 4), edge("module:b", "module:c")]
    );
    const previous = graph(
      ["module:a", "module:b", "module:c"],
      [edge("module:a", "module:b", 1), edge("module:c", "module:a")]
    );
    expect(
      compareArchitectureHistory(
        snapshot("current", [], current),
        snapshot("previous", [], previous)
      )
    ).toMatchObject({
      status: "COMPARABLE",
      addedRelationships: [{ sourceModuleId: "module:b", targetModuleId: "module:c" }],
      removedRelationships: [{ sourceModuleId: "module:c", targetModuleId: "module:a" }]
    });
  });

  it("excludes LOW-confidence modules and relationships without upgrading confidence", () => {
    const current = graph(
      ["module:a", "module:b", "module:low"],
      [
        edge("module:a", "module:b"),
        edge("module:a", "module:low"),
        edge("module:b", "module:a", 1, "LOW")
      ],
      new Set(["module:low"])
    );
    const result = compareArchitectureHistory(
      snapshot("current", [], current),
      snapshot("previous", [], graph(["module:a", "module:b"]))
    );
    expect(result).toMatchObject({
      status: "COMPARABLE",
      addedModules: [],
      removedModules: [],
      addedRelationships: [{ sourceModuleId: "module:a", targetModuleId: "module:b" }]
    });
  });

  it("is deterministic regardless of graph and occurrence insertion order", () => {
    const first = compareArchitectureHistory(
      snapshot(
        "current",
        [occurrence("z", "z"), occurrence("a", "a")],
        graph(["module:z", "module:a"])
      ),
      snapshot("previous", [], emptyGraph())
    );
    const second = compareArchitectureHistory(
      snapshot(
        "current",
        [occurrence("a", "a"), occurrence("z", "z")],
        graph(["module:a", "module:z"])
      ),
      snapshot("previous", [], emptyGraph())
    );
    expect(first).toEqual(second);
  });
});

function snapshot(
  id: string,
  occurrences: ArchitectureHistoricalSnapshot["occurrences"],
  value: ArchitectureGraph = emptyGraph(),
  compatibilityOverrides: Partial<ArchitectureCompatibility> = {}
): ArchitectureHistoricalSnapshot {
  return {
    processingRequestId: `request-${id}`,
    projectContextId: `context-${id}`,
    compatibility: { ...compatibility, ...compatibilityOverrides },
    graph: value,
    occurrences
  };
}

function occurrence(fingerprint: string, id: string) {
  return {
    id,
    fingerprint,
    ruleId: "architecture.circular-dependency",
    ruleVersion: "1.0"
  };
}

function emptyGraph(): ArchitectureGraph {
  return { nodes: [], edges: [] };
}

function graph(
  moduleIds: string[],
  edges: ArchitectureGraphEdge[] = [],
  lowConfidence = new Set<string>()
): ArchitectureGraph {
  return {
    nodes: moduleIds.map((moduleId) => ({
      moduleId,
      path: moduleId.slice("module:".length),
      confidence: lowConfidence.has(moduleId) ? "LOW" : "HIGH",
      sourceFileCount: 1,
      declarationCount: 1,
      internalRelationshipCount: 0,
      incomingRelationshipCount: 0,
      outgoingRelationshipCount: 0
    })),
    edges
  };
}

function edge(
  sourceModuleId: string,
  targetModuleId: string,
  relationshipCount = 1,
  confidence: "HIGH" | "MEDIUM" | "LOW" = "HIGH"
): ArchitectureGraphEdge {
  return { sourceModuleId, targetModuleId, relationshipCount, confidence, evidence: [] };
}
