import type {
  PackageManager,
  PackageManagerCandidate,
  PackageManagerDetection,
  ProjectManifest
} from "./project-profile.js";

const PACKAGE_MANAGER_BY_MANIFEST_TYPE = {
  PACKAGE_LOCK: "NPM",
  PNPM_LOCK: "PNPM",
  YARN_LOCK: "YARN"
} as const;

export class PackageManagerDetector {
  detect(manifests: readonly ProjectManifest[]): PackageManagerDetection {
    const candidates = new Map<PackageManager, string[]>();

    for (const manifest of manifests) {
      const packageManager =
        PACKAGE_MANAGER_BY_MANIFEST_TYPE[
          manifest.type as keyof typeof PACKAGE_MANAGER_BY_MANIFEST_TYPE
        ];

      if (!packageManager) {
        continue;
      }

      candidates.set(packageManager, [...(candidates.get(packageManager) ?? []), manifest.path]);
    }

    const sortedCandidates = this.sortCandidates(
      Array.from(candidates.entries()).map(([packageManager, evidence]) => ({
        packageManager,
        evidence: evidence.sort((left, right) => left.localeCompare(right))
      }))
    );

    if (sortedCandidates.length === 0) {
      return {
        status: "UNKNOWN",
        evidence: []
      };
    }

    if (sortedCandidates.length > 1) {
      return {
        status: "CONFLICT",
        candidates: sortedCandidates
      };
    }

    const candidate = sortedCandidates[0];

    if (!candidate) {
      return {
        status: "UNKNOWN",
        evidence: []
      };
    }

    return {
      status: "DETECTED",
      packageManager: candidate.packageManager,
      evidence: candidate.evidence
    };
  }

  private sortCandidates(
    candidates: readonly PackageManagerCandidate[]
  ): PackageManagerCandidate[] {
    return [...candidates].sort((left, right) =>
      left.packageManager.localeCompare(right.packageManager)
    );
  }
}
