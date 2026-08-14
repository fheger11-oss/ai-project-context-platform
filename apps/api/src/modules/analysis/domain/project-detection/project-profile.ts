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

export type PackageJsonPackage = {
  path: string;
  isPrimary: boolean;
  name: string | null;
  version: string | null;
  dependencies: readonly PackageDependency[];
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
