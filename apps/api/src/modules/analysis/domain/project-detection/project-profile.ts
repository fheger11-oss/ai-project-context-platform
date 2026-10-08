export type ProjectEcosystem = "NODE_JS" | "TYPESCRIPT" | "JAVASCRIPT";

export type ProjectLanguage = "TYPESCRIPT" | "JAVASCRIPT" | "JSON" | "CSS" | "HTML" | "MARKDOWN";

export type DetectedLanguage = {
  language: ProjectLanguage;
  fileCount: number;
};

export type PackageManager = "PNPM" | "NPM" | "YARN";

export type PackageManagerDetection =
  | {
      status: "DETECTED";
      packageManager: PackageManager;
      evidence: readonly string[];
    }
  | {
      status: "CONFLICT";
      candidates: readonly PackageManagerCandidate[];
    }
  | {
      status: "UNKNOWN";
      evidence: readonly string[];
    };

export type PackageManagerCandidate = {
  packageManager: PackageManager;
  evidence: readonly string[];
};

export type ProjectFramework = "REACT" | "NESTJS" | "NEXT_JS";

export type DetectedFramework = {
  framework: ProjectFramework;
  evidence: readonly string[];
};

export type ManifestType = "PACKAGE_JSON" | "PNPM_LOCK" | "PACKAGE_LOCK" | "YARN_LOCK" | "TSCONFIG";

export type ProjectManifest = {
  path: string;
  type: ManifestType;
  isPrimary: boolean;
};

export type PackageDependencyType =
  "DEPENDENCY" | "DEV_DEPENDENCY" | "PEER_DEPENDENCY" | "OPTIONAL_DEPENDENCY";

export type PackageDependency = {
  manifestPath: string;
  name: string;
  version: string;
  type: PackageDependencyType;
};

export type PackageScript = {
  manifestPath: string;
  name: string;
  command: string;
};

export type PackageSurfaceSelector =
  { kind: "CONDITION"; value: string } | { kind: "FALLBACK"; index: number };

export type PackagePublicSurfaceDeclaration = {
  manifestPath: string;
  sourceField: "EXPORTS" | "MAIN" | "MODULE" | "TYPES";
  subpath: string;
  selectorPath: readonly PackageSurfaceSelector[];
  disposition: "TARGET" | "BLOCKED";
  declaredTarget: string | null;
};

export function comparePackagePublicSurfaceDeclarations(
  left: PackagePublicSurfaceDeclaration,
  right: PackagePublicSurfaceDeclaration
): number {
  return (
    left.manifestPath.localeCompare(right.manifestPath) ||
    left.sourceField.localeCompare(right.sourceField) ||
    left.subpath.localeCompare(right.subpath) ||
    compareSelectorPaths(left.selectorPath, right.selectorPath) ||
    left.disposition.localeCompare(right.disposition) ||
    (left.declaredTarget ?? "").localeCompare(right.declaredTarget ?? "")
  );
}

function compareSelectorPaths(
  left: readonly PackageSurfaceSelector[],
  right: readonly PackageSurfaceSelector[]
): number {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    const leftSelector = left[index]!;
    const rightSelector = right[index]!;
    const kindOrder = leftSelector.kind.localeCompare(rightSelector.kind);
    if (kindOrder !== 0) return kindOrder;
    const valueOrder =
      leftSelector.kind === "FALLBACK" && rightSelector.kind === "FALLBACK"
        ? leftSelector.index - rightSelector.index
        : leftSelector.kind === "CONDITION" && rightSelector.kind === "CONDITION"
          ? leftSelector.value.localeCompare(rightSelector.value)
          : 0;
    if (valueOrder !== 0) return valueOrder;
  }
  return left.length - right.length;
}

export type PackageJsonPackage = {
  path: string;
  isPrimary: boolean;
  name: string | null;
  version: string | null;
  dependencies: readonly PackageDependency[];
  scripts?: readonly PackageScript[];
  publicSurfaceDeclarations: readonly PackagePublicSurfaceDeclaration[];
};

export type ProjectDetectionIssue = {
  path: string;
  code: "MALFORMED_PACKAGE_JSON" | "MISSING_MANIFEST_CONTENT";
};

export type ProjectProfile = {
  ecosystems: readonly ProjectEcosystem[];
  languages: readonly DetectedLanguage[];
  packageManager: PackageManagerDetection;
  frameworks: readonly DetectedFramework[];
  manifests: readonly ProjectManifest[];
  packages: readonly PackageJsonPackage[];
  dependencies: readonly PackageDependency[];
  issues: readonly ProjectDetectionIssue[];
};
