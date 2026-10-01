import type {
  ArchitectureComparisonDiagnostic,
  ArchitectureComparisonResponse,
  ArchitectureComparisonStatus,
  ArchitectureSnapshotSummary,
  SuppressedArchitectureClaim
} from "@ai-context/contracts";

import {
  compareArchitectureSnapshots,
  hasLowConfidenceTransition
} from "../domain/architecture-comparator.js";
import { parseArchitectureSnapshot } from "../domain/architecture-snapshot.js";
import type { ArchitectureHistorySnapshotSource } from "../domain/contracts/architecture-history-reader.contract.js";

export function adjacentComparisonStatus(
  baseline: ArchitectureHistorySnapshotSource | null,
  target: ArchitectureHistorySnapshotSource
): ArchitectureComparisonStatus {
  return buildArchitectureComparison(baseline, target).status;
}

export function buildArchitectureComparison(
  baseline: ArchitectureHistorySnapshotSource | null,
  target: ArchitectureHistorySnapshotSource,
  baselineHasPreviousSnapshot = false,
  baselineAdjacentCompatibility: ArchitectureComparisonStatus = "NO_BASELINE"
): ArchitectureComparisonResponse {
  const targetSummary = toArchitectureSnapshotSummary(target, baseline !== null, "NO_BASELINE");
  if (!baseline) {
    return { status: "NO_BASELINE", baseline: null, target: targetSummary };
  }

  const versionsMatch =
    baseline.contextVersion === target.contextVersion &&
    baseline.analyzerVersion === target.analyzerVersion;
  const baselineSummary = toArchitectureSnapshotSummary(
    baseline,
    baselineHasPreviousSnapshot,
    baselineAdjacentCompatibility
  );

  if (!versionsMatch) {
    return {
      status: "INCOMPATIBLE",
      baseline: baselineSummary,
      target: { ...targetSummary, adjacentCompatibility: "INCOMPATIBLE" }
    };
  }

  const baselineParsed = parseArchitectureSnapshot(baseline.snapshot);
  const targetParsed = parseArchitectureSnapshot(target.snapshot);
  const diagnostics: ArchitectureComparisonDiagnostic[] = [];
  if (!baselineParsed.valid)
    diagnostics.push(...prefixDiagnostics("Baseline", baselineParsed.diagnostics));
  if (!targetParsed.valid)
    diagnostics.push(...prefixDiagnostics("Target", targetParsed.diagnostics));

  if (!baselineParsed.valid || !targetParsed.valid) {
    return {
      status: "INCOMPLETE",
      baseline: baselineSummary,
      target: { ...targetSummary, adjacentCompatibility: "INCOMPLETE" },
      diagnostics,
      suppressedClaims: []
    };
  }

  const suppressedClaims = mergeSuppressed(
    baselineParsed.snapshot.suppressedClaims,
    targetParsed.snapshot.suppressedClaims
  );
  if (hasLowConfidenceTransition(baselineParsed.snapshot, targetParsed.snapshot)) {
    return {
      status: "INCOMPLETE",
      baseline: baselineSummary,
      target: { ...targetSummary, adjacentCompatibility: "INCOMPLETE" },
      diagnostics: [
        {
          code: "LOW_CONFIDENCE_TRANSITION",
          message: "A structural identity changed between eligible and low confidence."
        }
      ],
      suppressedClaims
    };
  }

  return {
    status: "COMPARABLE",
    baseline: baselineSummary,
    target: { ...targetSummary, adjacentCompatibility: "COMPARABLE" },
    ...compareArchitectureSnapshots(baselineParsed.snapshot, targetParsed.snapshot)
  };
}

export function toArchitectureSnapshotSummary(
  source: ArchitectureHistorySnapshotSource,
  hasPreviousSnapshot: boolean,
  adjacentCompatibility: ArchitectureComparisonStatus
): ArchitectureSnapshotSummary {
  return {
    historyId: source.historyId,
    projectContextId: source.projectContextId,
    analysisId: source.analysisId,
    scanId: source.scanId,
    commitSha: source.commitSha,
    promotedAt: source.promotedAt.toISOString(),
    generatedAt: source.generatedAt.toISOString(),
    contextVersion: source.contextVersion,
    analyzerVersion: source.analyzerVersion,
    hasPreviousSnapshot,
    adjacentCompatibility
  };
}

function prefixDiagnostics(
  label: string,
  diagnostics: ArchitectureComparisonDiagnostic[]
): ArchitectureComparisonDiagnostic[] {
  return diagnostics.map((diagnostic) => ({
    ...diagnostic,
    message: `${label}: ${diagnostic.message}`
  }));
}

function mergeSuppressed(
  baseline: SuppressedArchitectureClaim[],
  target: SuppressedArchitectureClaim[]
): SuppressedArchitectureClaim[] {
  const values = new Map<string, SuppressedArchitectureClaim>();
  for (const item of [...baseline, ...target]) values.set(item.identity, item);
  return [...values.values()].sort((left, right) => left.identity.localeCompare(right.identity));
}
