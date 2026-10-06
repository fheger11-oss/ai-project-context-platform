import { createHash } from "node:crypto";

import type { DependencyDeclaration, DependencySnapshot } from "./dependency-snapshot.js";
import {
  DEPENDENCY_DECLARATION_DIVERGENCE_RULE_ID,
  DEPENDENCY_DECLARATION_DIVERGENCE_RULE_VERSION
} from "./dependency-rule-version.js";

export type DependencyDivergenceEvidence = DependencyDeclaration & {
  projectContextId: string;
  analysisId: string;
  commitSha: string;
};

export type DependencyDivergenceFinding = {
  ruleId: typeof DEPENDENCY_DECLARATION_DIVERGENCE_RULE_ID;
  ruleVersion: typeof DEPENDENCY_DECLARATION_DIVERGENCE_RULE_VERSION;
  fingerprint: string;
  packageName: string;
  projectContextId: string;
  analysisId: string;
  commitSha: string;
  evidence: readonly DependencyDivergenceEvidence[];
};

export function detectDependencyDeclarationDivergence(
  snapshot: DependencySnapshot
): DependencyDivergenceFinding[] {
  const declarationsByPackage = new Map<string, DependencyDeclaration[]>();
  for (const declaration of snapshot.declarations) {
    declarationsByPackage.set(declaration.packageName, [
      ...(declarationsByPackage.get(declaration.packageName) ?? []),
      declaration
    ]);
  }

  return [...declarationsByPackage.entries()]
    .filter(
      ([, declarations]) => new Set(declarations.map((item) => item.declaredVersion)).size > 1
    )
    .map(([packageName, declarations]): DependencyDivergenceFinding => ({
      ruleId: DEPENDENCY_DECLARATION_DIVERGENCE_RULE_ID,
      ruleVersion: DEPENDENCY_DECLARATION_DIVERGENCE_RULE_VERSION,
      fingerprint: dependencyDivergenceFingerprint(packageName),
      packageName,
      projectContextId: snapshot.projectContextId,
      analysisId: snapshot.analysisId,
      commitSha: snapshot.commitSha,
      evidence: declarations
        .map((declaration) => ({
          ...declaration,
          projectContextId: snapshot.projectContextId,
          analysisId: snapshot.analysisId,
          commitSha: snapshot.commitSha
        }))
        .sort(compareEvidence)
    }))
    .sort(
      (left, right) =>
        left.ruleId.localeCompare(right.ruleId) ||
        left.packageName.localeCompare(right.packageName) ||
        left.fingerprint.localeCompare(right.fingerprint)
    );
}

export function dependencyDivergenceFingerprint(
  packageName: string,
  ruleId = DEPENDENCY_DECLARATION_DIVERGENCE_RULE_ID
): string {
  return createHash("sha256").update(`${ruleId}\0${packageName}`).digest("hex");
}

function compareEvidence(
  left: DependencyDivergenceEvidence,
  right: DependencyDivergenceEvidence
): number {
  return (
    left.manifestPath.localeCompare(right.manifestPath) ||
    left.dependencyType.localeCompare(right.dependencyType) ||
    left.declaredVersion.localeCompare(right.declaredVersion) ||
    left.packageName.localeCompare(right.packageName)
  );
}
