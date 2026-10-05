import { describe, expect, it } from "vitest";

import { measureArchitectureModules } from "./architecture-module-measurements.js";

describe("measureArchitectureModules", () => {
  it("persists claim counts and derives graph degree from distinct module edges", () => {
    const measurements = measureArchitectureModules({
      nodes: [
        {
          moduleId: "module:src/a",
          path: "src/a",
          confidence: "LOW",
          sourceFileCount: 4,
          declarationCount: 9,
          internalRelationshipCount: 3,
          incomingRelationshipCount: 5,
          outgoingRelationshipCount: 7
        },
        {
          moduleId: "module:src/b",
          path: "src/b",
          confidence: "HIGH",
          sourceFileCount: 2,
          declarationCount: 3,
          internalRelationshipCount: 0,
          incomingRelationshipCount: 1,
          outgoingRelationshipCount: 1
        }
      ],
      edges: [
        {
          sourceModuleId: "module:src/a",
          targetModuleId: "module:src/b",
          relationshipCount: 7,
          confidence: "HIGH",
          evidence: []
        },
        {
          sourceModuleId: "module:src/b",
          targetModuleId: "module:src/a",
          relationshipCount: 1,
          confidence: "HIGH",
          evidence: []
        }
      ]
    });

    expect(measurements[0]).toEqual({
      moduleId: "module:src/a",
      path: "src/a",
      confidence: "LOW",
      sourceFileCount: 4,
      declarationCount: 9,
      fanIn: 1,
      fanOut: 1,
      totalDegree: 2,
      relationshipCount: 15
    });
  });
});
