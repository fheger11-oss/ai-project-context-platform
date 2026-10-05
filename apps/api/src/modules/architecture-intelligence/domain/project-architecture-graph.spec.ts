import { describe, expect, it } from "vitest";

import { InvalidArchitectureProcessingInputError } from "./errors/invalid-architecture-processing-input.error.js";
import { projectArchitectureGraph } from "./project-architecture-graph.js";
import {
  analysisRelationship,
  moduleClaim,
  processingInput,
  relationshipClaim
} from "../testing/architecture-intelligence-fixtures.js";

describe("projectArchitectureGraph", () => {
  it("projects valid inferred modules and directed local relationships with evidence", () => {
    const aToB = relationshipClaim("src/a", "src/b");
    const graph = projectArchitectureGraph(
      processingInput(
        [moduleClaim("src/a"), moduleClaim("src/b"), aToB.claim],
        [aToB.analysisRelationship]
      )
    );

    expect(graph.nodes.map((node) => node.moduleId)).toEqual(["module:src/a", "module:src/b"]);
    expect(graph.edges).toEqual([
      expect.objectContaining({
        sourceModuleId: "module:src/a",
        targetModuleId: "module:src/b",
        relationshipCount: 1,
        confidence: "HIGH",
        evidence: [
          expect.objectContaining({
            sourcePath: "src/a/index.ts",
            targetPath: "src/b/index.ts",
            relationshipKind: "IMPORTS"
          })
        ]
      })
    ]);
  });

  it("does not turn package or unresolved Analysis relationships into module edges", () => {
    const graph = projectArchitectureGraph(
      processingInput(
        [moduleClaim("src/a"), moduleClaim("src/b")],
        [
          analysisRelationship("src/a/index.ts", null, "react", {
            targetKind: "PACKAGE",
            targetPackageName: "react"
          }),
          analysisRelationship("src/a/index.ts", null, "./missing", {
            targetKind: "UNRESOLVED",
            resolved: false
          })
        ]
      )
    );

    expect(graph.edges).toEqual([]);
  });

  it("retains valid low-confidence topology for measurements", () => {
    const edge = relationshipClaim("src/a", "src/b", {}, "LOW");
    const graph = projectArchitectureGraph(
      processingInput(
        [moduleClaim("src/a", {}, "LOW"), moduleClaim("src/b"), edge.claim],
        [edge.analysisRelationship]
      )
    );

    expect(graph.nodes[0]?.confidence).toBe("LOW");
    expect(graph.edges[0]?.confidence).toBe("LOW");
  });

  it("orders nodes, edges, and evidence deterministically", () => {
    const aToB = relationshipClaim("src/a", "src/b");
    const bToC = relationshipClaim("src/b", "src/c");
    const first = projectArchitectureGraph(
      processingInput(
        [moduleClaim("src/c"), bToC.claim, moduleClaim("src/a"), aToB.claim, moduleClaim("src/b")],
        [bToC.analysisRelationship, aToB.analysisRelationship]
      )
    );
    const second = projectArchitectureGraph(
      processingInput(
        [moduleClaim("src/b"), aToB.claim, moduleClaim("src/a"), bToC.claim, moduleClaim("src/c")],
        [aToB.analysisRelationship, bToC.analysisRelationship]
      )
    );

    expect(first).toEqual(second);
  });

  it.each([
    ["module identity", moduleClaim("src/a", { moduleId: "module:src/other" })],
    ["numeric measurement", moduleClaim("src/a", { declarationCount: -1 })],
    ["claim envelope", { ...moduleClaim("src/a"), kind: "OBSERVED" }]
  ])("rejects malformed %s input", (_label, claim) => {
    expect(() => projectArchitectureGraph(processingInput([claim], []))).toThrow(
      InvalidArchitectureProcessingInputError
    );
  });

  it("rejects malformed Analysis relationship evidence", () => {
    const edge = relationshipClaim("src/a", "src/b");
    const malformed = {
      ...edge.analysisRelationship,
      evidence: [{ ...edge.analysisRelationship.evidence[0], location: { start: 0 } }]
    };

    expect(() =>
      projectArchitectureGraph(
        processingInput([moduleClaim("src/a"), moduleClaim("src/b"), edge.claim], [malformed])
      )
    ).toThrow(InvalidArchitectureProcessingInputError);
  });
});
