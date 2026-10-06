import { describe, expect, it } from "vitest";

import type { DependencyDeclaration, DependencySnapshot } from "./dependency-snapshot.js";
import {
  compareDependencyDeclarations,
  compareDependencyHistory,
  dependencyHistoricalSnapshot,
  dependencyResultsAreCompatible,
  type DependencyCompatibility
} from "./dependency-history-comparison.js";

describe("dependency history compatibility", () => {
  const compatible = compatibility();

  it("requires all five version and rule fields to match", () => {
    expect(dependencyResultsAreCompatible(compatible, { ...compatible })).toBe(true);
    for (const [field, value] of [
      ["analyzerVersion", "analyzer-2"],
      ["contextVersion", "context-2"],
      ["processorVersion", "processor-2"],
      ["ruleId", "dependency.other"],
      ["ruleVersion", "2.0"]
    ] as const) {
      expect(dependencyResultsAreCompatible(compatible, { ...compatible, [field]: value })).toBe(
        false
      );
    }
  });
});

describe("dependency finding lifecycle", () => {
  it("classifies a first observation as NEW", () => {
    expect(compare(null, divergent("current")).lifecycle.map((item) => item.lifecycle)).toEqual([
      "NEW"
    ]);
  });

  it("classifies adjacent presence as PERSISTING", () => {
    expect(
      compare(divergent("previous"), divergent("current")).lifecycle.map((item) => item.lifecycle)
    ).toEqual(["PERSISTING"]);
  });

  it("derives RESOLVED from a previous occurrence without a synthetic current finding", () => {
    const result = compare(divergent("previous"), snapshot("current", []));
    expect(result.lifecycle).toHaveLength(1);
    expect(result.lifecycle[0]).toMatchObject({ lifecycle: "RESOLVED", packageName: "react" });
    expect(result.lifecycle[0]).not.toHaveProperty("currentFinding");
    expect(result.lifecycle[0]).toHaveProperty("previousFinding");
  });

  it("classifies presence after an adjacent absence and older compatible presence as RECURRING", () => {
    const current = dependencyHistoricalSnapshot(divergent("current"));
    const previous = dependencyHistoricalSnapshot(snapshot("previous", []));
    const older = dependencyHistoricalSnapshot(divergent("older"));
    expect(compareDependencyHistory(current, previous, [older]).lifecycle[0]?.lifecycle).toBe(
      "RECURRING"
    );
  });

  it("does not infer recurrence without a baseline or older occurrence", () => {
    expect(compare(null, divergent("current")).lifecycle[0]?.lifecycle).toBe("NEW");
    expect(compare(snapshot("previous", []), divergent("current")).lifecycle[0]?.lifecycle).toBe(
      "NEW"
    );
  });

  it("treats an incompatible adjacent baseline as a hard boundary", () => {
    const current = dependencyHistoricalSnapshot(divergent("current"));
    const previous = dependencyHistoricalSnapshot(snapshot("previous", []), {
      ...compatibility(),
      analyzerVersion: "analyzer-2"
    });
    const result = compareDependencyHistory(current, previous, [
      dependencyHistoricalSnapshot(divergent("older"))
    ]);
    expect(result.status).toBe("INCOMPATIBLE");
    expect(result.lifecycle[0]?.lifecycle).toBe("NEW");
  });

  it("does not search across an incompatible earlier boundary for recurrence", () => {
    const current = dependencyHistoricalSnapshot(divergent("current"));
    const previous = dependencyHistoricalSnapshot(snapshot("previous", []));
    const incompatible = dependencyHistoricalSnapshot(snapshot("boundary", []), {
      ...compatibility(),
      ruleVersion: "0.9"
    });
    const older = dependencyHistoricalSnapshot(divergent("older"));
    expect(
      compareDependencyHistory(current, previous, [incompatible, older]).lifecycle[0]?.lifecycle
    ).toBe("NEW");
  });
});

describe("dependency declaration changes", () => {
  it("derives ADDED and REMOVED declarations", () => {
    expect(compareDependencyDeclarations([declaration("react", "18")], [])).toMatchObject([
      { type: "ADDED", packageName: "react", currentVersion: "18" }
    ]);
    expect(compareDependencyDeclarations([], [declaration("react", "18")])).toMatchObject([
      { type: "REMOVED", packageName: "react", previousVersion: "18" }
    ]);
  });

  it("derives VERSION_CHANGED using manifest and package as identity", () => {
    expect(
      compareDependencyDeclarations([declaration("react", "19")], [declaration("react", "18")])
    ).toEqual([
      {
        type: "VERSION_CHANGED",
        manifestPath: "package.json",
        packageName: "react",
        previousVersion: "18",
        currentVersion: "19",
        previousDependencyType: "DEPENDENCY",
        currentDependencyType: "DEPENDENCY"
      }
    ]);
  });

  it("derives DEPENDENCY_TYPE_CHANGED", () => {
    expect(
      compareDependencyDeclarations(
        [declaration("react", "18", "DEV_DEPENDENCY")],
        [declaration("react", "18", "DEPENDENCY")]
      )
    ).toMatchObject([{ type: "DEPENDENCY_TYPE_CHANGED" }]);
  });

  it("represents simultaneous version and type changes once with both before/after values", () => {
    const result = compareDependencyDeclarations(
      [declaration("react", "19", "DEV_DEPENDENCY")],
      [declaration("react", "18", "DEPENDENCY")]
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: "VERSION_CHANGED",
      manifestPath: "package.json",
      packageName: "react",
      previousVersion: "18",
      currentVersion: "19",
      previousDependencyType: "DEPENDENCY",
      currentDependencyType: "DEV_DEPENDENCY"
    });
  });

  it("compares declarations in separate manifests independently", () => {
    const result = compareDependencyDeclarations(
      [declaration("react", "19", "DEPENDENCY", "apps/web/package.json")],
      [
        declaration("react", "18", "DEPENDENCY", "apps/web/package.json"),
        declaration("react", "18", "DEPENDENCY", "package.json")
      ]
    );
    expect(result.map(({ type, manifestPath }) => ({ type, manifestPath }))).toEqual([
      { type: "VERSION_CHANGED", manifestPath: "apps/web/package.json" },
      { type: "REMOVED", manifestPath: "package.json" }
    ]);
  });

  it("orders changes deterministically regardless of input ordering", () => {
    const current = [
      declaration("z", "2", "DEPENDENCY", "z/package.json"),
      declaration("a", "2", "DEPENDENCY", "a/package.json")
    ];
    const previous = [
      declaration("z", "1", "DEPENDENCY", "z/package.json"),
      declaration("a", "1", "DEPENDENCY", "a/package.json")
    ];
    expect(compareDependencyDeclarations(current, previous)).toEqual(
      compareDependencyDeclarations([...current].reverse(), [...previous].reverse())
    );
    expect(
      compareDependencyDeclarations(current, previous).map((change) => change.packageName)
    ).toEqual(["a", "z"]);
  });
});

function compare(previous: DependencySnapshot | null, current: DependencySnapshot) {
  return compareDependencyHistory(
    dependencyHistoricalSnapshot(current),
    previous ? dependencyHistoricalSnapshot(previous) : null
  );
}

function divergent(id: string) {
  return snapshot(id, [
    declaration("react", "18", "DEPENDENCY", "package.json"),
    declaration("react", "19", "DEPENDENCY", "apps/web/package.json")
  ]);
}

function snapshot(id: string, declarations: DependencyDeclaration[]): DependencySnapshot {
  return {
    repositoryId: "repository-a",
    projectContextId: `context-${id}`,
    analysisId: `analysis-${id}`,
    commitSha: `commit-${id}`,
    analyzerVersion: "analyzer-1",
    contextVersion: "context-1",
    declarations
  };
}

function declaration(
  packageName: string,
  declaredVersion: string,
  dependencyType: DependencyDeclaration["dependencyType"] = "DEPENDENCY",
  manifestPath = "package.json"
): DependencyDeclaration {
  return { packageName, declaredVersion, dependencyType, manifestPath };
}

function compatibility(): DependencyCompatibility {
  return {
    analyzerVersion: "analyzer-1",
    contextVersion: "context-1",
    processorVersion: "dependency-processor-1.0",
    ruleId: "dependency.declaration-divergence",
    ruleVersion: "1.0"
  };
}
