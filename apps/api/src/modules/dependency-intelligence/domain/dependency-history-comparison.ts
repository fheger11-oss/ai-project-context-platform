import {
  detectDependencyDeclarationDivergence,
  type DependencyDivergenceFinding
} from "./dependency-divergence-detector.js";
import type { DependencyDeclaration, DependencySnapshot } from "./dependency-snapshot.js";
import {
  DEPENDENCY_DECLARATION_DIVERGENCE_RULE_ID,
  DEPENDENCY_DECLARATION_DIVERGENCE_RULE_VERSION,
  DEPENDENCY_PROCESSOR_VERSION
} from "./dependency-rule-version.js";

export type DependencyCompatibility = {
  analyzerVersion: string;
  contextVersion: string;
  processorVersion: string;
  ruleId: string;
  ruleVersion: string;
};

export type DependencyFindingLifecycle = "NEW" | "PERSISTING" | "RESOLVED" | "RECURRING";

export type DependencyFindingTransition = {
  lifecycle: DependencyFindingLifecycle;
  fingerprint: string;
  packageName: string;
  currentFinding?: DependencyDivergenceFinding;
  previousFinding?: DependencyDivergenceFinding;
};

export type DependencyDeclarationChangeType =
  "ADDED" | "REMOVED" | "VERSION_CHANGED" | "DEPENDENCY_TYPE_CHANGED";

export type DependencyDeclarationChange = {
  type: DependencyDeclarationChangeType;
  manifestPath: string;
  packageName: string;
  previousVersion?: string;
  currentVersion?: string;
  previousDependencyType?: DependencyDeclaration["dependencyType"];
  currentDependencyType?: DependencyDeclaration["dependencyType"];
};

export type DependencyHistoricalSnapshot = {
  snapshot: DependencySnapshot;
  compatibility: DependencyCompatibility;
  findings: readonly DependencyDivergenceFinding[];
};

export type DependencyHistoryComparison = {
  status: "NO_BASELINE" | "INCOMPATIBLE" | "COMPARABLE";
  lifecycle: readonly DependencyFindingTransition[];
  declarationChanges: readonly DependencyDeclarationChange[];
};

export function dependencyCompatibility(snapshot: DependencySnapshot): DependencyCompatibility {
  return {
    analyzerVersion: snapshot.analyzerVersion,
    contextVersion: snapshot.contextVersion,
    processorVersion: DEPENDENCY_PROCESSOR_VERSION,
    ruleId: DEPENDENCY_DECLARATION_DIVERGENCE_RULE_ID,
    ruleVersion: DEPENDENCY_DECLARATION_DIVERGENCE_RULE_VERSION
  };
}

export function dependencyResultsAreCompatible(
  left: DependencyCompatibility,
  right: DependencyCompatibility
): boolean {
  return (
    left.analyzerVersion === right.analyzerVersion &&
    left.contextVersion === right.contextVersion &&
    left.processorVersion === right.processorVersion &&
    left.ruleId === right.ruleId &&
    left.ruleVersion === right.ruleVersion
  );
}

export function dependencyHistoricalSnapshot(
  snapshot: DependencySnapshot,
  compatibility: DependencyCompatibility = dependencyCompatibility(snapshot)
): DependencyHistoricalSnapshot {
  return {
    snapshot,
    compatibility,
    findings: detectDependencyDeclarationDivergence(snapshot)
  };
}

/** Earlier snapshots must be the contiguous promoted sequence, newest first. */
export function compareDependencyHistory(
  current: DependencyHistoricalSnapshot,
  previous: DependencyHistoricalSnapshot | null,
  earlier: readonly DependencyHistoricalSnapshot[] = []
): DependencyHistoryComparison {
  if (!previous) {
    return {
      status: "NO_BASELINE",
      lifecycle: current.findings.map((finding) => transition("NEW", finding)),
      declarationChanges: []
    };
  }
  if (!dependencyResultsAreCompatible(current.compatibility, previous.compatibility)) {
    return {
      status: "INCOMPATIBLE",
      lifecycle: current.findings.map((finding) => transition("NEW", finding)),
      declarationChanges: []
    };
  }

  const compatibleEarlier: DependencyHistoricalSnapshot[] = [];
  for (const snapshot of earlier) {
    if (!dependencyResultsAreCompatible(current.compatibility, snapshot.compatibility)) break;
    compatibleEarlier.push(snapshot);
  }
  const currentFindings = findingMap(current.findings);
  const previousFindings = findingMap(previous.findings);
  const fingerprints = [...new Set([...currentFindings.keys(), ...previousFindings.keys()])].sort(
    (left, right) => left.localeCompare(right)
  );
  const lifecycle = fingerprints.map((fingerprint): DependencyFindingTransition => {
    const currentFinding = currentFindings.get(fingerprint);
    const previousFinding = previousFindings.get(fingerprint);
    if (currentFinding && previousFinding) {
      return transition("PERSISTING", currentFinding, previousFinding);
    }
    if (currentFinding) {
      const recurred = compatibleEarlier.some((snapshot) =>
        snapshot.findings.some((finding) => finding.fingerprint === fingerprint)
      );
      return transition(recurred ? "RECURRING" : "NEW", currentFinding);
    }
    return transition("RESOLVED", previousFinding!, previousFinding, false);
  });

  return {
    status: "COMPARABLE",
    lifecycle,
    declarationChanges: compareDependencyDeclarations(
      current.snapshot.declarations,
      previous.snapshot.declarations
    )
  };
}

export function compareDependencyDeclarations(
  current: readonly DependencyDeclaration[],
  previous: readonly DependencyDeclaration[]
): DependencyDeclarationChange[] {
  const currentByIdentity = declarationGroups(current);
  const previousByIdentity = declarationGroups(previous);
  const identities = [...new Set([...currentByIdentity.keys(), ...previousByIdentity.keys()])].sort(
    (left, right) => left.localeCompare(right)
  );
  const changes: DependencyDeclarationChange[] = [];

  for (const identity of identities) {
    const currentValues = [...(currentByIdentity.get(identity) ?? [])];
    const previousValues = [...(previousByIdentity.get(identity) ?? [])];
    removeUnchanged(currentValues, previousValues);
    while (currentValues.length > 0 && previousValues.length > 0) {
      changes.push(updatedChange(currentValues.shift()!, previousValues.shift()!));
    }
    changes.push(...currentValues.map((declaration) => addedChange(declaration)));
    changes.push(...previousValues.map((declaration) => removedChange(declaration)));
  }
  return changes.sort(compareChanges);
}

function findingMap(findings: readonly DependencyDivergenceFinding[]) {
  return new Map(findings.map((finding) => [finding.fingerprint, finding]));
}

function transition(
  lifecycle: DependencyFindingLifecycle,
  finding: DependencyDivergenceFinding,
  previousFinding?: DependencyDivergenceFinding,
  hasCurrent = true
): DependencyFindingTransition {
  return {
    lifecycle,
    fingerprint: finding.fingerprint,
    packageName: finding.packageName,
    ...(hasCurrent ? { currentFinding: finding } : {}),
    ...(previousFinding ? { previousFinding } : {})
  };
}

function declarationGroups(values: readonly DependencyDeclaration[]) {
  const groups = new Map<string, DependencyDeclaration[]>();
  for (const value of [...values].sort(compareDeclarationValues)) {
    const identity = declarationIdentity(value);
    groups.set(identity, [...(groups.get(identity) ?? []), value]);
  }
  return groups;
}

function declarationIdentity(value: DependencyDeclaration): string {
  return `${value.manifestPath}\0${value.packageName}`;
}

function removeUnchanged(
  current: DependencyDeclaration[],
  previous: DependencyDeclaration[]
): void {
  for (let currentIndex = current.length - 1; currentIndex >= 0; currentIndex -= 1) {
    const match = previous.findIndex((value) => sameDeclaration(current[currentIndex]!, value));
    if (match >= 0) {
      current.splice(currentIndex, 1);
      previous.splice(match, 1);
    }
  }
}

function sameDeclaration(left: DependencyDeclaration, right: DependencyDeclaration): boolean {
  return (
    left.declaredVersion === right.declaredVersion && left.dependencyType === right.dependencyType
  );
}

function updatedChange(
  current: DependencyDeclaration,
  previous: DependencyDeclaration
): DependencyDeclarationChange {
  return {
    type:
      current.declaredVersion !== previous.declaredVersion
        ? "VERSION_CHANGED"
        : "DEPENDENCY_TYPE_CHANGED",
    manifestPath: current.manifestPath,
    packageName: current.packageName,
    previousVersion: previous.declaredVersion,
    currentVersion: current.declaredVersion,
    previousDependencyType: previous.dependencyType,
    currentDependencyType: current.dependencyType
  };
}

function addedChange(current: DependencyDeclaration): DependencyDeclarationChange {
  return {
    type: "ADDED",
    manifestPath: current.manifestPath,
    packageName: current.packageName,
    currentVersion: current.declaredVersion,
    currentDependencyType: current.dependencyType
  };
}

function removedChange(previous: DependencyDeclaration): DependencyDeclarationChange {
  return {
    type: "REMOVED",
    manifestPath: previous.manifestPath,
    packageName: previous.packageName,
    previousVersion: previous.declaredVersion,
    previousDependencyType: previous.dependencyType
  };
}

function compareDeclarationValues(left: DependencyDeclaration, right: DependencyDeclaration) {
  return (
    declarationIdentity(left).localeCompare(declarationIdentity(right)) ||
    left.dependencyType.localeCompare(right.dependencyType) ||
    left.declaredVersion.localeCompare(right.declaredVersion)
  );
}

function compareChanges(left: DependencyDeclarationChange, right: DependencyDeclarationChange) {
  return (
    left.manifestPath.localeCompare(right.manifestPath) ||
    left.packageName.localeCompare(right.packageName) ||
    left.type.localeCompare(right.type) ||
    (left.currentVersion ?? left.previousVersion ?? "").localeCompare(
      right.currentVersion ?? right.previousVersion ?? ""
    )
  );
}
