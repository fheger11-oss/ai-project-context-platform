const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";

export type FileCategory =
  | "SOURCE"
  | "TEST"
  | "CONFIG"
  | "DOCUMENTATION"
  | "GENERATED"
  | "ASSET"
  | "LOCKFILE"
  | "INFRASTRUCTURE"
  | "SCRIPT"
  | "UNKNOWN";

export type FileClassification = {
  path: string;
  category: FileCategory;
};

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

export type SourceLocation = {
  start: number;
  end: number;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
};

export type SourceLanguage = "TYPESCRIPT" | "TYPESCRIPT_TSX" | "JAVASCRIPT" | "JAVASCRIPT_JSX";

export type SourceDeclarationKind =
  | "FUNCTION"
  | "CLASS"
  | "INTERFACE"
  | "TYPE_ALIAS"
  | "ENUM"
  | "VARIABLE"
  | "CONSTANT"
  | "PARAMETER"
  | "METHOD"
  | "CLASS_PROPERTY";

export type SourceVisibility = "PUBLIC" | "PROTECTED" | "PRIVATE";

export type SourceDeclaration = {
  name: string;
  kind: SourceDeclarationKind;
  location: SourceLocation;
  containerName: string | null;
  visibility: SourceVisibility | null;
};

export type SourceNamedImport = {
  name: string;
  alias: string | null;
};

export type SourceImport = {
  moduleSpecifier: string;
  defaultImport: string | null;
  namespaceImport: string | null;
  namedImports: readonly SourceNamedImport[];
  typeOnly: boolean;
  location: SourceLocation;
};

export type SourceNamedExport = {
  name: string;
  alias: string | null;
};

export type SourceExportKind =
  "DECLARATION" | "DEFAULT" | "NAMED" | "NAMESPACE" | "EXPORT_ASSIGNMENT";

export type SourceExport = {
  kind: SourceExportKind;
  name: string | null;
  moduleSpecifier: string | null;
  namedExports: readonly SourceNamedExport[];
  location: SourceLocation;
};

export type SourceParseIssue = {
  code: "PARSE_ERROR" | "UNSUPPORTED_SOURCE" | "EMPTY_SOURCE";
  message: string;
};

export type SourceFileStructure = {
  path: string;
  language: SourceLanguage;
  imports: readonly SourceImport[];
  exports: readonly SourceExport[];
  declarations: readonly SourceDeclaration[];
  issues: readonly SourceParseIssue[];
};

export type RelationshipKind = "IMPORTS" | "RE_EXPORTS";

export type RelationshipTargetKind = "LOCAL_FILE" | "PACKAGE" | "UNRESOLVED";

export type RelationshipEvidenceKind = "IMPORT_DECLARATION" | "EXPORT_DECLARATION";

export type RelationshipEvidence = {
  kind: RelationshipEvidenceKind;
  location: SourceLocation;
  names: readonly string[];
  typeOnly: boolean;
};

export type PackageDependencyEvidence = {
  manifestPath: string;
  version: string;
  type: PackageDependencyType;
};

export type SourceRelationship = {
  sourcePath: string;
  kind: RelationshipKind;
  specifier: string;
  targetKind: RelationshipTargetKind;
  targetPath: string | null;
  targetPackageName: string | null;
  resolved: boolean;
  packageDependency: PackageDependencyEvidence | null;
  evidence: readonly RelationshipEvidence[];
};

export type DependencyEdgeKind = "LOCAL_FILE" | "PACKAGE" | "UNRESOLVED";

export type DependencyEdge = {
  sourcePath: string;
  kind: RelationshipKind;
  dependencyKind: DependencyEdgeKind;
  specifier: string;
  targetPath: string | null;
  packageName: string | null;
  resolved: boolean;
  packageDependency: PackageDependencyEvidence | null;
};

export type AnalysisIssue =
  | {
      stage: "PROJECT_DETECTION";
      path: string;
      code: ProjectDetectionIssue["code"];
    }
  | {
      stage: "SOURCE_STRUCTURE";
      path: string;
      code: SourceParseIssue["code"];
      message: string;
    }
  | {
      stage: "RELATIONSHIP_ANALYSIS";
      path: string;
      specifier: string;
      code: "UNRESOLVED_LOCAL_MODULE" | "UNKNOWN_PACKAGE_DEPENDENCY";
    };

export type AnalysisResult = {
  analysisId: string;
  scanId: string;
  repositoryId: string;
  commitSha: string;
  analyzerVersion: string;
  generatedAt: string;
  project: ProjectProfile;
  files: readonly FileClassification[];
  sourceStructures: readonly SourceFileStructure[];
  relationships: readonly SourceRelationship[];
  dependencies: readonly DependencyEdge[];
  issues: readonly AnalysisIssue[];
};

type RequestOptions = {
  accessToken: string;
  body?: unknown;
  method?: "GET" | "POST";
};

export class AnalysisApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestOptions): Promise<T> {
  const init: RequestInit = {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      "Content-Type": "application/json"
    }
  };

  if (options.body) {
    init.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_URL}${path}`, init);

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    throw new AnalysisApiRequestError(
      payload?.message ?? "Analysis request failed",
      response.status
    );
  }

  return response.json() as Promise<T>;
}

export function startAnalysis(accessToken: string, scanId: string) {
  return request<AnalysisResult>("/analyses", {
    accessToken,
    method: "POST",
    body: {
      scanId
    }
  });
}

export function getAnalysisResult(accessToken: string, analysisId: string) {
  return request<AnalysisResult>(`/analyses/${encodeURIComponent(analysisId)}`, { accessToken });
}
