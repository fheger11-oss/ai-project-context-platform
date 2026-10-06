import { describe, expect, it } from "vitest";

import type { DependencyDeclaration, DependencySnapshot } from "./dependency-snapshot.js";
import {
  dependencyDivergenceFingerprint,
  detectDependencyDeclarationDivergence
} from "./dependency-divergence-detector.js";

describe("dependency declaration divergence", () => {
  it("does not find divergence for one declaration", () => {
    expect(detectDependencyDeclarationDivergence(snapshot([declaration("a", "1")]))).toEqual([]);
  });

  it("does not find divergence for the same version across manifests or dependency types", () => {
    expect(
      detectDependencyDeclarationDivergence(
        snapshot([
          declaration("react", "^18", "a/package.json", "DEPENDENCY"),
          declaration("react", "^18", "b/package.json", "DEV_DEPENDENCY")
        ])
      )
    ).toEqual([]);
  });

  it("creates exactly one finding for different versions across manifests", () => {
    const findings = detectDependencyDeclarationDivergence(
      snapshot([
        declaration("react", "^18", "package.json"),
        declaration("react", "^19", "apps/web/package.json")
      ])
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      ruleId: "dependency.declaration-divergence",
      ruleVersion: "1.0",
      packageName: "react"
    });
  });

  it("creates one finding for three declarations containing two exact versions", () => {
    const findings = detectDependencyDeclarationDivergence(
      snapshot([
        declaration("react", "^18", "a/package.json"),
        declaration("react", "^19", "b/package.json"),
        declaration("react", "^18", "c/package.json")
      ])
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.evidence).toHaveLength(3);
  });

  it("preserves scoped package identity", () => {
    const findings = detectDependencyDeclarationDivergence(
      snapshot([
        declaration("@tanstack/react-query", "5", "a/package.json"),
        declaration("@tanstack/react-query", "6", "b/package.json")
      ])
    );
    expect(findings[0]?.packageName).toBe("@tanstack/react-query");
  });

  it("finds one divergence when versions and dependency types both differ", () => {
    const findings = detectDependencyDeclarationDivergence(
      snapshot([
        declaration("react", "18", "a/package.json", "DEPENDENCY"),
        declaration("react", "19", "b/package.json", "PEER_DEPENDENCY")
      ])
    );
    expect(findings).toHaveLength(1);
  });

  it("keeps fingerprint identity stable when evidence changes", () => {
    const first = detectDependencyDeclarationDivergence(
      snapshot([
        declaration("react", "18", "a/package.json"),
        declaration("react", "19", "b/package.json")
      ])
    )[0];
    const changed = detectDependencyDeclarationDivergence(
      snapshot([
        declaration("react", "18", "different/package.json"),
        declaration("react", "20", "b/package.json", "DEV_DEPENDENCY")
      ])
    )[0];
    expect(first?.fingerprint).toBe(changed?.fingerprint);
  });

  it("uses package and rule identity in the fingerprint", () => {
    expect(dependencyDivergenceFingerprint("a")).not.toBe(dependencyDivergenceFingerprint("b"));
    expect(dependencyDivergenceFingerprint("a")).not.toBe(
      dependencyDivergenceFingerprint("a", "dependency.other-rule")
    );
  });

  it("includes exact deterministic evidence and provenance", () => {
    const finding = detectDependencyDeclarationDivergence(
      snapshot([
        declaration("react", "19", "z/package.json", "DEV_DEPENDENCY"),
        declaration("react", "18", "a/package.json", "DEPENDENCY")
      ])
    )[0];
    expect(finding?.evidence).toEqual([
      {
        ...declaration("react", "18", "a/package.json", "DEPENDENCY"),
        projectContextId: "context-current",
        analysisId: "analysis-current",
        commitSha: "commit-current"
      },
      {
        ...declaration("react", "19", "z/package.json", "DEV_DEPENDENCY"),
        projectContextId: "context-current",
        analysisId: "analysis-current",
        commitSha: "commit-current"
      }
    ]);
  });

  it("orders multiple findings by stable logical identity", () => {
    const findings = detectDependencyDeclarationDivergence(
      snapshot([
        declaration("z", "1", "a/package.json"),
        declaration("z", "2", "b/package.json"),
        declaration("a", "1", "a/package.json"),
        declaration("a", "2", "b/package.json")
      ])
    );
    expect(findings.map((finding) => finding.packageName)).toEqual(["a", "z"]);
  });
});

function declaration(
  packageName: string,
  declaredVersion: string,
  manifestPath = "package.json",
  dependencyType: DependencyDeclaration["dependencyType"] = "DEPENDENCY"
): DependencyDeclaration {
  return { packageName, declaredVersion, manifestPath, dependencyType };
}

function snapshot(declarations: DependencyDeclaration[]): DependencySnapshot {
  return {
    repositoryId: "repository-a",
    projectContextId: "context-current",
    analysisId: "analysis-current",
    commitSha: "commit-current",
    analyzerVersion: "analysis-1",
    contextVersion: "context-1",
    declarations
  };
}
