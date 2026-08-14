import type { PackageDependencyType } from "../project-detection/project-profile.js";
import type { SourceLocation } from "../source-structure/source-location.js";
import type { RelationshipKind } from "./relationship-kind.js";

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

export type RelationshipAnalysisIssue = {
  sourcePath: string;
  specifier: string;
  code: "UNRESOLVED_LOCAL_MODULE" | "UNKNOWN_PACKAGE_DEPENDENCY";
};

export type RelationshipAnalysisResult = {
  relationships: readonly SourceRelationship[];
  dependencies: readonly DependencyEdge[];
  issues: readonly RelationshipAnalysisIssue[];
};
