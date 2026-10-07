export type ContextClaimKind = "OBSERVED" | "INFERRED";

export type ContextConfidence = "HIGH" | "MEDIUM" | "LOW";

export type ContextEvidenceKind =
  | "PROJECT_METADATA"
  | "MANIFEST"
  | "DEPENDENCY"
  | "FILE_CLASSIFICATION"
  | "SOURCE_STRUCTURE"
  | "RELATIONSHIP"
  | "ISSUE";

export type ContextEvidenceReference =
  | {
      kind: "PROJECT_METADATA";
      field: string;
    }
  | {
      kind: "MANIFEST";
      path: string;
    }
  | {
      kind: "DEPENDENCY";
      manifestPath: string;
      name: string;
    }
  | {
      kind: "FILE_CLASSIFICATION";
      path: string;
    }
  | {
      kind: "SOURCE_STRUCTURE";
      path: string;
    }
  | {
      kind: "RELATIONSHIP";
      sourcePath: string;
      specifier: string;
    }
  | {
      kind: "ISSUE";
      stage: string;
      path: string;
      code: string;
    };

export type ContextEvidence = {
  kind: ContextEvidenceKind;
  reference: ContextEvidenceReference;
};

export type ContextClaim<TValue = unknown> = {
  value: TValue;
  kind: ContextClaimKind;
  confidence: ContextConfidence;
  evidence: readonly ContextEvidence[];
};

export type ContextSection = {
  claims: readonly ContextClaim[];
};

export type SemanticSourceLocation = {
  start: number;
  end: number;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
};

export type SemanticPackage = {
  id: string;
  manifestPath: string;
  name: string | null;
  version: string | null;
  isPrimary: boolean;
  dependencies: readonly {
    manifestPath: string;
    name: string;
    version: string;
    type: "DEPENDENCY" | "DEV_DEPENDENCY" | "PEER_DEPENDENCY" | "OPTIONAL_DEPENDENCY";
  }[];
  scripts: readonly {
    manifestPath: string;
    name: string;
    command: string;
  }[];
};

export type SemanticFile = {
  id: string;
  path: string;
  category:
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
  language: "TYPESCRIPT" | "TYPESCRIPT_TSX" | "JAVASCRIPT" | "JAVASCRIPT_JSX" | null;
  parseIssues: readonly {
    code: "PARSE_ERROR" | "UNSUPPORTED_SOURCE" | "EMPTY_SOURCE";
    message: string;
  }[];
  symbolIds: readonly string[];
  importIds: readonly string[];
  exportIds: readonly string[];
};

export type SemanticSymbol = {
  id: string;
  fileId: string;
  filePath: string;
  name: string;
  kind:
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
  containerName: string | null;
  visibility: "PUBLIC" | "PROTECTED" | "PRIVATE" | null;
  location: SemanticSourceLocation;
};

export type SemanticImport = {
  id: string;
  fileId: string;
  filePath: string;
  moduleSpecifier: string;
  defaultImport: string | null;
  namespaceImport: string | null;
  namedImports: readonly { name: string; alias: string | null }[];
  typeOnly: boolean;
  location: SemanticSourceLocation;
};

export type SemanticExport = {
  id: string;
  fileId: string;
  filePath: string;
  kind: "DECLARATION" | "DEFAULT" | "NAMED" | "NAMESPACE" | "EXPORT_ASSIGNMENT";
  name: string | null;
  moduleSpecifier: string | null;
  namedExports: readonly { name: string; alias: string | null }[];
  location: SemanticSourceLocation;
};

export type SemanticRelationshipEvidence = {
  id: string;
  kind: "IMPORT_DECLARATION" | "EXPORT_DECLARATION";
  location: SemanticSourceLocation;
  names: readonly string[];
  typeOnly: boolean;
  sourceRecordId: string | null;
};

export type SemanticRelationship = {
  id: string;
  kind: "IMPORTS" | "RE_EXPORTS";
  sourceFileId: string;
  sourcePath: string;
  specifier: string;
  targetKind: "LOCAL_FILE" | "PACKAGE" | "UNRESOLVED";
  targetFileId: string | null;
  targetPath: string | null;
  targetPackageName: string | null;
  resolved: boolean;
  packageDependency: {
    manifestPath: string;
    version: string;
    type: "DEPENDENCY" | "DEV_DEPENDENCY" | "PEER_DEPENDENCY" | "OPTIONAL_DEPENDENCY";
  } | null;
  evidence: readonly SemanticRelationshipEvidence[];
};

export type ProjectContextSemantic = {
  packages: readonly SemanticPackage[];
  files: readonly SemanticFile[];
  symbols: readonly SemanticSymbol[];
  imports: readonly SemanticImport[];
  exports: readonly SemanticExport[];
  relationships: readonly SemanticRelationship[];
};

export type ProjectContextResponse = {
  id: string;
  contextId: string;
  analysisId: string;
  scanId: string;
  repositoryId: string;
  commitSha: string;
  contextVersion: string;
  generatedAt: string;
  createdAt: string;
  project: ContextSection;
  technology: ContextSection;
  structure: ContextSection;
  architecture: ContextSection;
  entryPoints: ContextSection;
  testing: ContextSection;
  infrastructure: ContextSection;
  ambiguities: readonly ContextClaim[];
  semantic?: ProjectContextSemantic;
};

export type ProjectContextHistoryItem = {
  id: string;
  contextId: string;
  analysisId: string;
  scanId: string;
  repositoryId: string;
  commitSha: string;
  contextVersion: string;
  generatedAt: string;
  createdAt: string;
};

export type ProjectContextHistoryResponse = {
  items: readonly ProjectContextHistoryItem[];
};

export type GenerateProjectContextResponse = ProjectContextResponse;
