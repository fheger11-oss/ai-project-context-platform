export type CreateAnalysisRequest = {
  scanId: string;
};

export type AnalysisFileCategory =
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

export type AnalysisFileClassification = {
  path: string;
  category: AnalysisFileCategory;
};

export type AnalysisProjectEcosystem = "NODE_JS" | "TYPESCRIPT" | "JAVASCRIPT";

export type AnalysisProjectLanguage =
  "TYPESCRIPT" | "JAVASCRIPT" | "JSON" | "CSS" | "HTML" | "MARKDOWN";

export type AnalysisDetectedLanguage = {
  language: AnalysisProjectLanguage;
  fileCount: number;
};

export type AnalysisPackageManager = "PNPM" | "NPM" | "YARN";

export type AnalysisPackageManagerDetection =
  | {
      status: "DETECTED";
      packageManager: AnalysisPackageManager;
      evidence: readonly string[];
    }
  | {
      status: "CONFLICT";
      candidates: readonly AnalysisPackageManagerCandidate[];
    }
  | {
      status: "UNKNOWN";
      evidence: readonly string[];
    };

export type AnalysisPackageManagerCandidate = {
  packageManager: AnalysisPackageManager;
  evidence: readonly string[];
};

export type AnalysisProjectFramework = "REACT" | "NESTJS" | "NEXT_JS";

export type AnalysisDetectedFramework = {
  framework: AnalysisProjectFramework;
  evidence: readonly string[];
};

export type AnalysisManifestType =
  "PACKAGE_JSON" | "PNPM_LOCK" | "PACKAGE_LOCK" | "YARN_LOCK" | "TSCONFIG";

export type AnalysisProjectManifest = {
  path: string;
  type: AnalysisManifestType;
  isPrimary: boolean;
};

export type AnalysisPackageDependencyType =
  "DEPENDENCY" | "DEV_DEPENDENCY" | "PEER_DEPENDENCY" | "OPTIONAL_DEPENDENCY";

export type AnalysisPackageDependency = {
  manifestPath: string;
  name: string;
  version: string;
  type: AnalysisPackageDependencyType;
};

export type AnalysisPackageJsonPackage = {
  path: string;
  isPrimary: boolean;
  name: string | null;
  version: string | null;
  dependencies: readonly AnalysisPackageDependency[];
};

export type AnalysisProjectDetectionIssue = {
  path: string;
  code: "MALFORMED_PACKAGE_JSON" | "MISSING_MANIFEST_CONTENT";
};

export type AnalysisProjectProfile = {
  ecosystems: readonly AnalysisProjectEcosystem[];
  languages: readonly AnalysisDetectedLanguage[];
  packageManager: AnalysisPackageManagerDetection;
  frameworks: readonly AnalysisDetectedFramework[];
  manifests: readonly AnalysisProjectManifest[];
  packages: readonly AnalysisPackageJsonPackage[];
  dependencies: readonly AnalysisPackageDependency[];
  issues: readonly AnalysisProjectDetectionIssue[];
};

export type AnalysisSourceLocation = {
  start: number;
  end: number;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
};

export type AnalysisSourceLanguage =
  "TYPESCRIPT" | "TYPESCRIPT_TSX" | "JAVASCRIPT" | "JAVASCRIPT_JSX";

export type AnalysisSourceDeclarationKind =
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

export type AnalysisSourceVisibility = "PUBLIC" | "PROTECTED" | "PRIVATE";

export type AnalysisSourceDeclaration = {
  name: string;
  kind: AnalysisSourceDeclarationKind;
  location: AnalysisSourceLocation;
  containerName: string | null;
  visibility: AnalysisSourceVisibility | null;
};

export type AnalysisSourceNamedImport = {
  name: string;
  alias: string | null;
};

export type AnalysisSourceImport = {
  moduleSpecifier: string;
  defaultImport: string | null;
  namespaceImport: string | null;
  namedImports: readonly AnalysisSourceNamedImport[];
  typeOnly: boolean;
  location: AnalysisSourceLocation;
};

export type AnalysisSourceNamedExport = {
  name: string;
  alias: string | null;
};

export type AnalysisSourceExportKind =
  "DECLARATION" | "DEFAULT" | "NAMED" | "NAMESPACE" | "EXPORT_ASSIGNMENT";

export type AnalysisSourceExport = {
  kind: AnalysisSourceExportKind;
  name: string | null;
  moduleSpecifier: string | null;
  namedExports: readonly AnalysisSourceNamedExport[];
  location: AnalysisSourceLocation;
};

export type AnalysisSourceParseIssue = {
  code: "PARSE_ERROR" | "UNSUPPORTED_SOURCE" | "EMPTY_SOURCE";
  message: string;
};

export type AnalysisSourceFileStructure = {
  path: string;
  language: AnalysisSourceLanguage;
  imports: readonly AnalysisSourceImport[];
  exports: readonly AnalysisSourceExport[];
  declarations: readonly AnalysisSourceDeclaration[];
  issues: readonly AnalysisSourceParseIssue[];
};

export type AnalysisRelationshipKind = "IMPORTS" | "RE_EXPORTS";

export type AnalysisRelationshipTargetKind = "LOCAL_FILE" | "PACKAGE" | "UNRESOLVED";

export type AnalysisRelationshipEvidenceKind = "IMPORT_DECLARATION" | "EXPORT_DECLARATION";

export type AnalysisRelationshipEvidence = {
  kind: AnalysisRelationshipEvidenceKind;
  location: AnalysisSourceLocation;
  names: readonly string[];
  typeOnly: boolean;
};

export type AnalysisPackageDependencyEvidence = {
  manifestPath: string;
  version: string;
  type: AnalysisPackageDependencyType;
};

export type AnalysisSourceRelationship = {
  sourcePath: string;
  kind: AnalysisRelationshipKind;
  specifier: string;
  targetKind: AnalysisRelationshipTargetKind;
  targetPath: string | null;
  targetPackageName: string | null;
  resolved: boolean;
  packageDependency: AnalysisPackageDependencyEvidence | null;
  evidence: readonly AnalysisRelationshipEvidence[];
};

export type AnalysisDependencyEdgeKind = "LOCAL_FILE" | "PACKAGE" | "UNRESOLVED";

export type AnalysisDependencyEdge = {
  sourcePath: string;
  kind: AnalysisRelationshipKind;
  dependencyKind: AnalysisDependencyEdgeKind;
  specifier: string;
  targetPath: string | null;
  packageName: string | null;
  resolved: boolean;
  packageDependency: AnalysisPackageDependencyEvidence | null;
};

export type AnalysisIssue =
  | {
      stage: "PROJECT_DETECTION";
      path: string;
      code: AnalysisProjectDetectionIssue["code"];
    }
  | {
      stage: "SOURCE_STRUCTURE";
      path: string;
      code: AnalysisSourceParseIssue["code"];
      message: string;
    }
  | {
      stage: "RELATIONSHIP_ANALYSIS";
      path: string;
      specifier: string;
      code: "UNRESOLVED_LOCAL_MODULE" | "UNKNOWN_PACKAGE_DEPENDENCY";
    };

export type AnalysisResultResponse = {
  analysisId: string;
  scanId: string;
  repositoryId: string;
  commitSha: string;
  analyzerVersion: string;
  generatedAt: string;
  project: AnalysisProjectProfile;
  files: readonly AnalysisFileClassification[];
  sourceStructures: readonly AnalysisSourceFileStructure[];
  relationships: readonly AnalysisSourceRelationship[];
  dependencies: readonly AnalysisDependencyEdge[];
  issues: readonly AnalysisIssue[];
};
