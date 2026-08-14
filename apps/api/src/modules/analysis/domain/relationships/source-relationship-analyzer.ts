import type { PackageDependency, ProjectProfile } from "../project-detection/project-profile.js";
import type { SourceExport } from "../source-structure/source-export.js";
import type { SourceFileStructure } from "../source-structure/source-file-structure.js";
import type { SourceImport } from "../source-structure/source-import.js";
import { type RelationshipKind } from "./relationship-kind.js";
import {
  isRelativeSpecifier,
  ModuleSpecifierResolver,
  packageNameFromSpecifier
} from "./module-specifier-resolver.js";
import type {
  DependencyEdge,
  PackageDependencyEvidence,
  RelationshipAnalysisIssue,
  RelationshipAnalysisResult,
  RelationshipEvidence,
  SourceRelationship
} from "./source-relationship.js";

type RelationshipDraft = Omit<SourceRelationship, "evidence"> & {
  evidence: RelationshipEvidence[];
};

export class SourceRelationshipAnalyzer {
  analyze(input: {
    sourceStructures: readonly SourceFileStructure[];
    projectProfile: ProjectProfile;
  }): RelationshipAnalysisResult {
    const resolver = new ModuleSpecifierResolver(
      input.sourceStructures.map((source) => source.path)
    );
    const dependencies = new Map(
      input.projectProfile.dependencies.map((dependency) => [dependency.name, dependency])
    );
    const relationships = new Map<string, RelationshipDraft>();
    const issues: RelationshipAnalysisIssue[] = [];

    for (const structure of input.sourceStructures) {
      for (const sourceImport of structure.imports) {
        this.addRelationship({
          relationships,
          issues,
          resolver,
          dependencies,
          sourcePath: structure.path,
          kind: "IMPORTS",
          specifier: sourceImport.moduleSpecifier,
          evidence: this.importEvidence(sourceImport)
        });
      }

      for (const sourceExport of structure.exports) {
        if (!sourceExport.moduleSpecifier) {
          continue;
        }

        this.addRelationship({
          relationships,
          issues,
          resolver,
          dependencies,
          sourcePath: structure.path,
          kind: "RE_EXPORTS",
          specifier: sourceExport.moduleSpecifier,
          evidence: this.exportEvidence(sourceExport)
        });
      }
    }

    const orderedRelationships = Array.from(relationships.values()).sort(compareRelationships);

    return {
      relationships: orderedRelationships,
      dependencies: this.dependencyEdges(orderedRelationships),
      issues: uniqueIssues(issues).sort(compareIssues)
    };
  }

  private addRelationship(input: {
    relationships: Map<string, RelationshipDraft>;
    issues: RelationshipAnalysisIssue[];
    resolver: ModuleSpecifierResolver;
    dependencies: ReadonlyMap<string, PackageDependency>;
    sourcePath: string;
    kind: RelationshipKind;
    specifier: string;
    evidence: RelationshipEvidence;
  }): void {
    if (input.specifier.trim() === "") {
      return;
    }

    const relationship = this.resolveRelationship(input);
    const key = relationshipKey(relationship);
    const existing = input.relationships.get(key);

    if (existing) {
      existing.evidence.push(input.evidence);
      return;
    }

    input.relationships.set(key, {
      ...relationship,
      evidence: [input.evidence]
    });
  }

  private resolveRelationship(input: {
    issues: RelationshipAnalysisIssue[];
    resolver: ModuleSpecifierResolver;
    dependencies: ReadonlyMap<string, PackageDependency>;
    sourcePath: string;
    kind: RelationshipKind;
    specifier: string;
    evidence: RelationshipEvidence;
  }): Omit<SourceRelationship, "evidence"> {
    if (isRelativeSpecifier(input.specifier)) {
      const resolved = input.resolver.resolve(input.sourcePath, input.specifier);

      if (!resolved.resolved) {
        input.issues.push({
          sourcePath: input.sourcePath,
          specifier: input.specifier,
          code: "UNRESOLVED_LOCAL_MODULE"
        });
      }

      return {
        sourcePath: input.sourcePath,
        kind: input.kind,
        specifier: input.specifier,
        targetKind: resolved.resolved ? "LOCAL_FILE" : "UNRESOLVED",
        targetPath: resolved.targetPath,
        targetPackageName: null,
        resolved: resolved.resolved,
        packageDependency: null
      };
    }

    const packageName = packageNameFromSpecifier(input.specifier);
    const dependency = input.dependencies.get(packageName) ?? null;

    if (!dependency) {
      input.issues.push({
        sourcePath: input.sourcePath,
        specifier: input.specifier,
        code: "UNKNOWN_PACKAGE_DEPENDENCY"
      });
    }

    return {
      sourcePath: input.sourcePath,
      kind: input.kind,
      specifier: input.specifier,
      targetKind: "PACKAGE",
      targetPath: null,
      targetPackageName: packageName,
      resolved: dependency !== null,
      packageDependency: dependency ? packageEvidence(dependency) : null
    };
  }

  private importEvidence(sourceImport: SourceImport): RelationshipEvidence {
    return {
      kind: "IMPORT_DECLARATION",
      location: sourceImport.location,
      names: [
        ...toArray(sourceImport.defaultImport),
        ...sourceImport.namedImports.map((namedImport) => namedImport.alias ?? namedImport.name),
        ...toArray(sourceImport.namespaceImport)
      ].sort(),
      typeOnly: sourceImport.typeOnly
    };
  }

  private exportEvidence(sourceExport: SourceExport): RelationshipEvidence {
    return {
      kind: "EXPORT_DECLARATION",
      location: sourceExport.location,
      names: sourceExport.namedExports
        .map((namedExport) => namedExport.alias ?? namedExport.name)
        .sort(),
      typeOnly: false
    };
  }

  private dependencyEdges(relationships: readonly SourceRelationship[]): DependencyEdge[] {
    const edges = new Map<string, DependencyEdge>();

    for (const relationship of relationships) {
      const edge: DependencyEdge = {
        sourcePath: relationship.sourcePath,
        kind: relationship.kind,
        dependencyKind: relationship.targetKind,
        specifier: relationship.specifier,
        targetPath: relationship.targetPath,
        packageName: relationship.targetPackageName,
        resolved: relationship.resolved,
        packageDependency: relationship.packageDependency
      };

      edges.set(dependencyKey(edge), edge);
    }

    return Array.from(edges.values()).sort(compareDependencyEdges);
  }
}

function packageEvidence(dependency: PackageDependency): PackageDependencyEvidence {
  return {
    manifestPath: dependency.manifestPath,
    version: dependency.version,
    type: dependency.type
  };
}

function toArray(value: string | null): string[] {
  return value ? [value] : [];
}

function relationshipKey(relationship: Omit<SourceRelationship, "evidence">): string {
  return [
    relationship.sourcePath,
    relationship.kind,
    relationship.specifier,
    relationship.targetKind,
    relationship.targetPath ?? "",
    relationship.targetPackageName ?? "",
    String(relationship.resolved)
  ].join("\0");
}

function dependencyKey(edge: DependencyEdge): string {
  return [
    edge.sourcePath,
    edge.kind,
    edge.dependencyKind,
    edge.specifier,
    edge.targetPath ?? "",
    edge.packageName ?? "",
    String(edge.resolved)
  ].join("\0");
}

function compareRelationships(a: SourceRelationship, b: SourceRelationship): number {
  return (
    a.sourcePath.localeCompare(b.sourcePath) ||
    a.kind.localeCompare(b.kind) ||
    a.specifier.localeCompare(b.specifier) ||
    (a.targetPath ?? "").localeCompare(b.targetPath ?? "") ||
    (a.targetPackageName ?? "").localeCompare(b.targetPackageName ?? "") ||
    Number(a.resolved) - Number(b.resolved)
  );
}

function compareDependencyEdges(a: DependencyEdge, b: DependencyEdge): number {
  return (
    a.sourcePath.localeCompare(b.sourcePath) ||
    a.kind.localeCompare(b.kind) ||
    a.specifier.localeCompare(b.specifier) ||
    (a.targetPath ?? "").localeCompare(b.targetPath ?? "") ||
    (a.packageName ?? "").localeCompare(b.packageName ?? "") ||
    Number(a.resolved) - Number(b.resolved)
  );
}

function uniqueIssues(issues: readonly RelationshipAnalysisIssue[]): RelationshipAnalysisIssue[] {
  return Array.from(new Map(issues.map((issue) => [JSON.stringify(issue), issue])).values());
}

function compareIssues(a: RelationshipAnalysisIssue, b: RelationshipAnalysisIssue): number {
  return (
    a.sourcePath.localeCompare(b.sourcePath) ||
    a.specifier.localeCompare(b.specifier) ||
    a.code.localeCompare(b.code)
  );
}
