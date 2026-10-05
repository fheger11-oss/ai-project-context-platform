import { describe, expect, it } from "vitest";

import type { ArchitectureGraph, ArchitectureGraphEdge } from "./architecture-graph.js";
import {
  circularDependencyFingerprint,
  detectCircularDependencies
} from "./circular-dependency-detector.js";

describe("detectCircularDependencies", () => {
  it.each([
    [
      "two-module",
      ["a", "b"],
      [
        ["a", "b"],
        ["b", "a"]
      ]
    ],
    [
      "three-module",
      ["a", "b", "c"],
      [
        ["a", "b"],
        ["b", "c"],
        ["c", "a"]
      ]
    ],
    [
      "larger",
      ["a", "b", "c", "d"],
      [
        ["a", "b"],
        ["b", "c"],
        ["c", "d"],
        ["d", "a"]
      ]
    ]
  ] as const)("detects one %s strongly connected component", (_label, modules, edges) => {
    const findings = detectCircularDependencies(graph(modules, edges));

    expect(findings).toHaveLength(1);
    expect(findings[0]?.moduleIds).toEqual(modules.map(id));
  });

  it("does not report disconnected or acyclic modules", () => {
    expect(
      detectCircularDependencies(
        graph(
          ["a", "b", "c", "d"],
          [
            ["a", "b"],
            ["b", "c"]
          ]
        )
      )
    ).toEqual([]);
  });

  it("is deterministic regardless of node and edge insertion order", () => {
    const forward = graph(
      ["a", "b", "c"],
      [
        ["a", "b"],
        ["b", "c"],
        ["c", "a"]
      ]
    );
    const reversed = graph(
      ["c", "b", "a"],
      [
        ["c", "a"],
        ["b", "c"],
        ["a", "b"]
      ]
    );

    expect(detectCircularDependencies(forward)).toEqual(detectCircularDependencies(reversed));
  });

  it("suppresses cycles involving a low-confidence module or edge", () => {
    const lowModule = graph(
      ["a", "b"],
      [
        ["a", "b"],
        ["b", "a"]
      ]
    );
    lowModule.nodes[0] = { ...lowModule.nodes[0]!, confidence: "LOW" };
    const lowEdge = graph(
      ["a", "b"],
      [
        ["a", "b"],
        ["b", "a"]
      ]
    );
    lowEdge.edges[0] = { ...lowEdge.edges[0]!, confidence: "LOW" };

    expect(detectCircularDependencies(lowModule)).toEqual([]);
    expect(detectCircularDependencies(lowEdge)).toEqual([]);
  });

  it("returns multiple SCCs as separate findings", () => {
    const findings = detectCircularDependencies(
      graph(
        ["a", "b", "c", "d"],
        [
          ["a", "b"],
          ["b", "a"],
          ["c", "d"],
          ["d", "c"]
        ]
      )
    );

    expect(findings.map((finding) => finding.moduleIds)).toEqual([
      [id("a"), id("b")],
      [id("c"), id("d")]
    ]);
  });

  it("does not create duplicate findings for duplicate edges", () => {
    const value = graph(
      ["a", "b"],
      [
        ["a", "b"],
        ["a", "b"],
        ["b", "a"]
      ]
    );

    expect(detectCircularDependencies(value)).toHaveLength(1);
  });
});

describe("circularDependencyFingerprint", () => {
  it("is stable for the same SCC membership", () => {
    expect(circularDependencyFingerprint([id("b"), id("a"), id("a")])).toBe(
      circularDependencyFingerprint([id("a"), id("b")])
    );
  });

  it("changes when SCC membership changes", () => {
    expect(circularDependencyFingerprint([id("a"), id("b")])).not.toBe(
      circularDependencyFingerprint([id("a"), id("b"), id("c")])
    );
  });

  it("does not depend on evidence location", () => {
    const first = graph(
      ["a", "b"],
      [
        ["a", "b"],
        ["b", "a"]
      ]
    );
    const second = graph(
      ["a", "b"],
      [
        ["a", "b"],
        ["b", "a"]
      ]
    );
    second.edges[0] = {
      ...second.edges[0]!,
      evidence: [
        {
          sourcePath: "src/a/index.ts",
          targetPath: "src/b/index.ts",
          relationshipKind: "IMPORTS",
          specifier: "../b",
          location: {
            start: 99,
            end: 100,
            startLine: 10,
            startColumn: 1,
            endLine: 10,
            endColumn: 2
          }
        }
      ]
    };

    expect(detectCircularDependencies(first)[0]?.fingerprint).toBe(
      detectCircularDependencies(second)[0]?.fingerprint
    );
  });
});

function graph(
  modules: readonly string[],
  edgePairs: readonly (readonly [string, string])[]
): {
  nodes: ArchitectureGraph["nodes"] extends readonly (infer N)[] ? N[] : never;
  edges: ArchitectureGraphEdge[];
} {
  return {
    nodes: modules.map((moduleId) => ({
      moduleId: id(moduleId),
      path: `src/${moduleId}`,
      confidence: "HIGH" as const,
      sourceFileCount: 2,
      declarationCount: 3,
      internalRelationshipCount: 1,
      incomingRelationshipCount: 1,
      outgoingRelationshipCount: 1
    })),
    edges: edgePairs.map(([source, target]) => ({
      sourceModuleId: id(source),
      targetModuleId: id(target),
      relationshipCount: 1,
      confidence: "HIGH" as const,
      evidence: []
    }))
  };
}

function id(value: string) {
  return `module:src/${value}`;
}
