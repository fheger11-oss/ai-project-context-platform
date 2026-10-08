import { describe, expect, it } from "vitest";

import {
  canonicalDependency,
  canonicalModule
} from "../testing/architecture-intelligence-fixtures.js";
import {
  canonicalCircularDependencyFingerprint,
  detectCanonicalCircularDependencies
} from "./canonical-circular-dependency-detector.js";

describe("detectCanonicalCircularDependencies", () => {
  it("detects a simple canonical cycle with exact dependency and relationship evidence", () => {
    const findings = detectCanonicalCircularDependencies({
      modules: [canonicalModule("module:b"), canonicalModule("module:a")],
      dependencies: [
        canonicalDependency("dependency:b-a", "module:b", "module:a", ["relationship:2"]),
        canonicalDependency("dependency:a-b", "module:a", "module:b", [
          "relationship:1",
          "relationship:1"
        ])
      ],
      unresolvedSemanticRelationshipCount: 0
    });

    expect(findings).toEqual([
      expect.objectContaining({
        ruleId: "architecture.circular-dependency",
        ruleVersion: "2.0",
        applicability: "APPLICABLE",
        moduleIds: ["module:a", "module:b"],
        dependencyIds: ["dependency:a-b", "dependency:b-a"],
        relationshipIds: ["relationship:1", "relationship:2"]
      })
    ]);
  });

  it("detects multi-module and multiple independent cycles but not acyclic nodes", () => {
    const findings = detectCanonicalCircularDependencies({
      modules: ["a", "b", "c", "d", "e", "f"].map((id) => canonicalModule(id)),
      dependencies: [
        canonicalDependency("a-b", "a", "b"),
        canonicalDependency("b-c", "b", "c"),
        canonicalDependency("c-a", "c", "a"),
        canonicalDependency("d-e", "d", "e"),
        canonicalDependency("e-d", "e", "d"),
        canonicalDependency("e-f", "e", "f")
      ],
      unresolvedSemanticRelationshipCount: 0
    });

    expect(findings.map((finding) => finding.moduleIds)).toEqual([
      ["a", "b", "c"],
      ["d", "e"]
    ]);
  });

  it("returns no finding for an acyclic graph or a self-edge", () => {
    expect(
      detectCanonicalCircularDependencies({
        modules: [canonicalModule("a"), canonicalModule("b")],
        dependencies: [canonicalDependency("a-a", "a", "a"), canonicalDependency("a-b", "a", "b")],
        unresolvedSemanticRelationshipCount: 0
      })
    ).toEqual([]);
  });

  it("is deterministic across module, dependency, and relationship ordering", () => {
    const modules = [canonicalModule("a"), canonicalModule("b")];
    const dependencies = [
      canonicalDependency("a-b", "a", "b", ["r2", "r1"]),
      canonicalDependency("b-a", "b", "a", ["r3"])
    ];
    const forward = detectCanonicalCircularDependencies({
      modules,
      dependencies,
      unresolvedSemanticRelationshipCount: 0
    });
    const reversed = detectCanonicalCircularDependencies({
      modules: [...modules].reverse(),
      dependencies: [...dependencies].reverse().map((dependency) => ({
        ...dependency,
        relationshipIds: [...dependency.relationshipIds].reverse()
      })),
      unresolvedSemanticRelationshipCount: 0
    });

    expect(reversed).toEqual(forward);
  });

  it("marks a proven cycle partially applicable when unresolved relationships exist", () => {
    const findings = detectCanonicalCircularDependencies({
      modules: [canonicalModule("a"), canonicalModule("b")],
      dependencies: [canonicalDependency("a-b", "a", "b"), canonicalDependency("b-a", "b", "a")],
      unresolvedSemanticRelationshipCount: 1
    });

    expect(findings[0]?.applicability).toBe("PARTIALLY_APPLICABLE");
  });

  it("keeps fingerprints independent of context and mutable evidence metadata", () => {
    const first = detectCanonicalCircularDependencies({
      modules: [canonicalModule("a"), canonicalModule("b")],
      dependencies: [
        canonicalDependency("first-a-b", "a", "b", ["relationship:old"]),
        canonicalDependency("first-b-a", "b", "a")
      ],
      unresolvedSemanticRelationshipCount: 0
    })[0];
    const second = detectCanonicalCircularDependencies({
      modules: [canonicalModule("b"), canonicalModule("a")],
      dependencies: [
        {
          ...canonicalDependency("changed-a-b", "a", "b", ["relationship:new"]),
          relationshipCount: 99
        },
        canonicalDependency("changed-b-a", "b", "a")
      ],
      unresolvedSemanticRelationshipCount: 0
    })[0];

    expect(first?.fingerprint).toBe(second?.fingerprint);
    expect(canonicalCircularDependencyFingerprint(["a", "b"])).not.toBe(
      canonicalCircularDependencyFingerprint(["a", "c"])
    );
  });

  it("rejects fabricated module endpoints and duplicate canonical IDs", () => {
    expect(() =>
      detectCanonicalCircularDependencies({
        modules: [canonicalModule("a")],
        dependencies: [canonicalDependency("a-missing", "a", "missing")],
        unresolvedSemanticRelationshipCount: 0
      })
    ).toThrow(/unknown module/);
    expect(() =>
      detectCanonicalCircularDependencies({
        modules: [canonicalModule("a"), canonicalModule("a")],
        dependencies: [],
        unresolvedSemanticRelationshipCount: 0
      })
    ).toThrow(/duplicated/);
  });
});
