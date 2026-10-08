import type { FileCategory } from "../../analysis/domain/classification/file-category.js";
import type {
  PackageDependency,
  PackagePublicSurfaceDeclaration,
  PackageScript
} from "../../analysis/domain/project-detection/project-profile.js";
import type {
  PackageDependencyEvidence,
  RelationshipEvidenceKind,
  RelationshipTargetKind
} from "../../analysis/domain/relationships/source-relationship.js";
import type { RelationshipKind } from "../../analysis/domain/relationships/relationship-kind.js";
import type {
  SourceDeclarationKind,
  SourceVisibility
} from "../../analysis/domain/source-structure/source-declaration.js";
import type {
  SourceExportKind,
  SourceNamedExport
} from "../../analysis/domain/source-structure/source-export.js";
import type {
  SourceLanguage,
  SourceParseIssue
} from "../../analysis/domain/source-structure/source-file-structure.js";
import type { SourceNamedImport } from "../../analysis/domain/source-structure/source-import.js";
import type { SourceLocation } from "../../analysis/domain/source-structure/source-location.js";

/**
 * Semantic IDs address occurrences inside one repository snapshot. They are deterministic for the
 * same analyzer output, but they are not logical identities across commits.
 */
export type SemanticPackage = {
  id: string;
  manifestPath: string;
  name: string | null;
  version: string | null;
  isPrimary: boolean;
  dependencies: readonly PackageDependency[];
  scripts: readonly PackageScript[];
  publicSurfaceDeclarations: readonly PackagePublicSurfaceDeclaration[];
};

export type SemanticFile = {
  id: string;
  path: string;
  category: FileCategory;
  language: SourceLanguage | null;
  parseIssues: readonly SourceParseIssue[];
  symbolIds: readonly string[];
  importIds: readonly string[];
  exportIds: readonly string[];
};

export type SemanticSymbol = {
  id: string;
  fileId: string;
  filePath: string;
  name: string;
  kind: SourceDeclarationKind;
  containerName: string | null;
  visibility: SourceVisibility | null;
  location: SourceLocation;
};

export type SemanticImport = {
  id: string;
  fileId: string;
  filePath: string;
  moduleSpecifier: string;
  defaultImport: string | null;
  namespaceImport: string | null;
  namedImports: readonly SourceNamedImport[];
  typeOnly: boolean;
  location: SourceLocation;
};

export type SemanticExport = {
  id: string;
  fileId: string;
  filePath: string;
  kind: SourceExportKind;
  name: string | null;
  moduleSpecifier: string | null;
  namedExports: readonly SourceNamedExport[];
  location: SourceLocation;
};

export type SemanticRelationshipEvidence = {
  id: string;
  kind: RelationshipEvidenceKind;
  location: SourceLocation;
  names: readonly string[];
  typeOnly: boolean;
  sourceRecordId: string | null;
};

export type SemanticRelationship = {
  id: string;
  kind: RelationshipKind;
  sourceFileId: string;
  sourcePath: string;
  specifier: string;
  targetKind: RelationshipTargetKind;
  targetFileId: string | null;
  targetPath: string | null;
  targetPackageName: string | null;
  resolved: boolean;
  packageDependency: PackageDependencyEvidence | null;
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

export const EMPTY_PROJECT_CONTEXT_SEMANTIC: ProjectContextSemantic = {
  packages: [],
  files: [],
  symbols: [],
  imports: [],
  exports: [],
  relationships: []
};

export function semanticWithDefaults(
  semantic: ProjectContextSemantic | undefined
): ProjectContextSemantic {
  const value = semantic ?? EMPTY_PROJECT_CONTEXT_SEMANTIC;
  return {
    ...value,
    packages: value.packages.map((semanticPackage) => ({
      ...semanticPackage,
      publicSurfaceDeclarations: semanticPackage.publicSurfaceDeclarations ?? []
    }))
  };
}
