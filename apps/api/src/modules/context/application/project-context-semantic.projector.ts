import type { AnalysisResult } from "../../analysis/domain/contracts/analysis-result.contract.js";
import type { SourceLocation } from "../../analysis/domain/source-structure/source-location.js";
import type {
  ProjectContextSemantic,
  SemanticExport,
  SemanticFile,
  SemanticImport,
  SemanticPackage,
  SemanticRelationship,
  SemanticRelationshipEvidence,
  SemanticSymbol
} from "../domain/project-context-semantic.js";

export function projectContextSemantic(analysis: AnalysisResult): ProjectContextSemantic {
  const structures = [...analysis.sourceStructures].sort((left, right) =>
    left.path.localeCompare(right.path)
  );
  const symbols = structures
    .flatMap((structure) =>
      structure.declarations.map((declaration): SemanticSymbol => ({
        id: semanticId("symbol", [
          structure.path,
          declaration.kind,
          declaration.location.start,
          declaration.location.end
        ]),
        fileId: fileId(structure.path),
        filePath: structure.path,
        name: declaration.name,
        kind: declaration.kind,
        containerName: declaration.containerName,
        visibility: declaration.visibility,
        location: cloneLocation(declaration.location)
      }))
    )
    .sort(compareLocatedRecords);
  const imports = structures
    .flatMap((structure) =>
      structure.imports.map((sourceImport): SemanticImport => ({
        id: importId(structure.path, sourceImport.location),
        fileId: fileId(structure.path),
        filePath: structure.path,
        moduleSpecifier: sourceImport.moduleSpecifier,
        defaultImport: sourceImport.defaultImport,
        namespaceImport: sourceImport.namespaceImport,
        namedImports: sourceImport.namedImports.map((item) => ({ ...item })),
        typeOnly: sourceImport.typeOnly,
        location: cloneLocation(sourceImport.location)
      }))
    )
    .sort(compareLocatedRecords);
  const exports = structures
    .flatMap((structure) =>
      structure.exports.map((sourceExport): SemanticExport => ({
        id: exportId(structure.path, sourceExport.location),
        fileId: fileId(structure.path),
        filePath: structure.path,
        kind: sourceExport.kind,
        name: sourceExport.name,
        moduleSpecifier: sourceExport.moduleSpecifier,
        namedExports: sourceExport.namedExports.map((item) => ({ ...item })),
        location: cloneLocation(sourceExport.location)
      }))
    )
    .sort(compareLocatedRecords);
  const symbolsByPath = groupIdsByPath(symbols);
  const importsByPath = groupIdsByPath(imports);
  const exportsByPath = groupIdsByPath(exports);
  const structuresByPath = new Map(structures.map((structure) => [structure.path, structure]));

  return {
    packages: [...analysis.project.packages].map(toSemanticPackage).sort(comparePackages),
    files: [...analysis.files]
      .map((file): SemanticFile => {
        const structure = structuresByPath.get(file.path);
        return {
          id: fileId(file.path),
          path: file.path,
          category: file.category,
          language: structure?.language ?? null,
          parseIssues: structure?.issues.map((issue) => ({ ...issue })) ?? [],
          symbolIds: symbolsByPath.get(file.path) ?? [],
          importIds: importsByPath.get(file.path) ?? [],
          exportIds: exportsByPath.get(file.path) ?? []
        };
      })
      .sort((left, right) => left.path.localeCompare(right.path)),
    symbols,
    imports,
    exports,
    relationships: [...analysis.relationships]
      .map(toSemanticRelationship)
      .sort(compareRelationships)
  };
}

function toSemanticPackage(
  packageJson: AnalysisResult["project"]["packages"][number]
): SemanticPackage {
  return {
    id: semanticId("package", [packageJson.path]),
    manifestPath: packageJson.path,
    name: packageJson.name,
    version: packageJson.version,
    isPrimary: packageJson.isPrimary,
    dependencies: packageJson.dependencies.map((dependency) => ({ ...dependency })),
    scripts: (packageJson.scripts ?? []).map((script) => ({ ...script })),
    publicSurfaceDeclarations: (packageJson.publicSurfaceDeclarations ?? []).map((declaration) => ({
      ...declaration,
      selectorPath: declaration.selectorPath.map((selector) => ({ ...selector }))
    }))
  };
}

function toSemanticRelationship(
  relationship: AnalysisResult["relationships"][number]
): SemanticRelationship {
  return {
    id: semanticId("relationship", [
      relationship.sourcePath,
      relationship.kind,
      relationship.specifier,
      relationship.targetKind,
      relationship.targetPath,
      relationship.targetPackageName,
      relationship.resolved
    ]),
    kind: relationship.kind,
    sourceFileId: fileId(relationship.sourcePath),
    sourcePath: relationship.sourcePath,
    specifier: relationship.specifier,
    targetKind: relationship.targetKind,
    targetFileId: relationship.targetPath ? fileId(relationship.targetPath) : null,
    targetPath: relationship.targetPath,
    targetPackageName: relationship.targetPackageName,
    resolved: relationship.resolved,
    packageDependency: relationship.packageDependency
      ? { ...relationship.packageDependency }
      : null,
    evidence: relationship.evidence
      .map((evidence): SemanticRelationshipEvidence => {
        const sourceRecordId =
          evidence.kind === "IMPORT_DECLARATION"
            ? importId(relationship.sourcePath, evidence.location)
            : exportId(relationship.sourcePath, evidence.location);
        return {
          id: semanticId("relationship-evidence", [
            relationship.sourcePath,
            relationship.kind,
            relationship.specifier,
            evidence.kind,
            evidence.location.start,
            evidence.location.end,
            [...evidence.names].sort(),
            evidence.typeOnly
          ]),
          kind: evidence.kind,
          location: cloneLocation(evidence.location),
          names: [...evidence.names].sort(),
          typeOnly: evidence.typeOnly,
          sourceRecordId
        };
      })
      .sort(compareRelationshipEvidence)
  };
}

function semanticId(kind: string, components: readonly unknown[]): string {
  return `${kind}:${encodeURIComponent(JSON.stringify(components))}`;
}

function fileId(path: string): string {
  return semanticId("file", [path]);
}

function importId(path: string, location: SourceLocation): string {
  return semanticId("import", [path, "IMPORT", location.start, location.end]);
}

function exportId(path: string, location: SourceLocation): string {
  return semanticId("export", [path, "EXPORT", location.start, location.end]);
}

function cloneLocation(location: SourceLocation): SourceLocation {
  return { ...location };
}

function groupIdsByPath(
  records: readonly { filePath: string; id: string }[]
): Map<string, string[]> {
  const values = new Map<string, string[]>();
  for (const record of records) {
    values.set(record.filePath, [...(values.get(record.filePath) ?? []), record.id]);
  }
  return values;
}

function compareLocatedRecords(
  left: { filePath: string; location: SourceLocation; id: string },
  right: { filePath: string; location: SourceLocation; id: string }
): number {
  return (
    left.filePath.localeCompare(right.filePath) ||
    left.location.start - right.location.start ||
    left.location.end - right.location.end ||
    left.id.localeCompare(right.id)
  );
}

function comparePackages(left: SemanticPackage, right: SemanticPackage): number {
  return left.manifestPath.localeCompare(right.manifestPath) || left.id.localeCompare(right.id);
}

function compareRelationships(left: SemanticRelationship, right: SemanticRelationship): number {
  return (
    left.sourcePath.localeCompare(right.sourcePath) ||
    left.kind.localeCompare(right.kind) ||
    left.specifier.localeCompare(right.specifier) ||
    (left.targetPath ?? "").localeCompare(right.targetPath ?? "") ||
    (left.targetPackageName ?? "").localeCompare(right.targetPackageName ?? "") ||
    Number(left.resolved) - Number(right.resolved) ||
    left.id.localeCompare(right.id)
  );
}

function compareRelationshipEvidence(
  left: SemanticRelationshipEvidence,
  right: SemanticRelationshipEvidence
): number {
  return (
    left.location.start - right.location.start ||
    left.location.end - right.location.end ||
    left.kind.localeCompare(right.kind) ||
    left.names.join("\0").localeCompare(right.names.join("\0")) ||
    Number(left.typeOnly) - Number(right.typeOnly) ||
    left.id.localeCompare(right.id)
  );
}
