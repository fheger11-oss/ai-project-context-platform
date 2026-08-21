import type { FileClassification } from "../classification/file-classification.js";
import type {
  AnalysisComponentResult,
  AnalysisIssue,
  AnalysisResult,
  AnalysisResultContext
} from "../contracts/analysis-result.contract.js";
import { InconsistentAnalysisResultContextError } from "../errors/inconsistent-analysis-result-context.error.js";
import type { PackageJsonPackage, ProjectProfile } from "../project-detection/project-profile.js";
import type {
  DependencyEdge,
  RelationshipAnalysisResult,
  SourceRelationship
} from "../relationships/source-relationship.js";
import type { SourceFileStructure } from "../source-structure/source-file-structure.js";

export type AnalysisResultAggregationInput = AnalysisResultContext & {
  analysisId: string;
  analyzerVersion: string;
  generatedAt: Date;
  project: AnalysisComponentResult<ProjectProfile>;
  files: AnalysisComponentResult<readonly FileClassification[]>;
  sourceStructures: AnalysisComponentResult<readonly SourceFileStructure[]>;
  relationships: AnalysisComponentResult<RelationshipAnalysisResult>;
};

export class AnalysisResultAggregator {
  aggregate(input: AnalysisResultAggregationInput): AnalysisResult {
    const context = this.context(input);

    this.assertContext(context, input.project, "project");
    this.assertContext(context, input.files, "files");
    this.assertContext(context, input.sourceStructures, "sourceStructures");
    this.assertContext(context, input.relationships, "relationships");

    const sourceStructures = deduplicateSourceStructures(input.sourceStructures.result);
    const relationships = deduplicateRelationships(input.relationships.result.relationships);
    const dependencies = deduplicateDependencies(input.relationships.result.dependencies);

    return {
      analysisId: input.analysisId,
      scanId: input.scanId,
      repositoryId: input.repositoryId,
      commitSha: input.commitSha,
      analyzerVersion: input.analyzerVersion,
      generatedAt: input.generatedAt,
      project: normalizeProjectProfile(input.project.result),
      files: deduplicateFileClassifications(input.files.result),
      sourceStructures,
      relationships,
      dependencies,
      issues: aggregateIssues({
        project: input.project.result,
        sourceStructures,
        relationships: input.relationships.result
      })
    };
  }

  private context(input: AnalysisResultContext): AnalysisResultContext {
    return {
      scanId: input.scanId,
      repositoryId: input.repositoryId,
      commitSha: input.commitSha
    };
  }

  private assertContext(
    expected: AnalysisResultContext,
    component: AnalysisResultContext,
    componentName: string
  ): void {
    if (
      component.scanId !== expected.scanId ||
      component.repositoryId !== expected.repositoryId ||
      component.commitSha !== expected.commitSha
    ) {
      throw new InconsistentAnalysisResultContextError(expected, component, componentName);
    }
  }
}

function normalizeProjectProfile(project: ProjectProfile): ProjectProfile {
  return {
    ...project,
    ecosystems: [...project.ecosystems].sort(),
    languages: [...project.languages].sort((left, right) =>
      left.language.localeCompare(right.language)
    ),
    frameworks: [...project.frameworks].sort((left, right) =>
      left.framework.localeCompare(right.framework)
    ),
    manifests: [...project.manifests].sort(
      (left, right) => left.path.localeCompare(right.path) || left.type.localeCompare(right.type)
    ),
    packages: [...project.packages]
      .map(normalizePackageJsonPackage)
      .sort((left, right) => left.path.localeCompare(right.path)),
    dependencies: [...project.dependencies].sort(
      (left, right) =>
        left.manifestPath.localeCompare(right.manifestPath) ||
        left.name.localeCompare(right.name) ||
        left.type.localeCompare(right.type)
    ),
    issues: [...project.issues].sort(
      (left, right) => left.path.localeCompare(right.path) || left.code.localeCompare(right.code)
    )
  };
}

function normalizePackageJsonPackage(packageJson: PackageJsonPackage): PackageJsonPackage {
  const scripts = packageJson.scripts
    ? [...packageJson.scripts].sort(
        (left, right) =>
          left.manifestPath.localeCompare(right.manifestPath) ||
          left.name.localeCompare(right.name) ||
          left.command.localeCompare(right.command)
      )
    : undefined;

  return {
    ...packageJson,
    dependencies: [...packageJson.dependencies].sort(
      (left, right) =>
        left.manifestPath.localeCompare(right.manifestPath) ||
        left.name.localeCompare(right.name) ||
        left.type.localeCompare(right.type)
    ),
    ...(scripts && scripts.length > 0 ? { scripts } : {})
  };
}

function deduplicateFileClassifications(
  classifications: readonly FileClassification[]
): FileClassification[] {
  return Array.from(
    new Map(classifications.map((classification) => [classification.path, classification])).values()
  ).sort((left, right) => left.path.localeCompare(right.path));
}

function deduplicateSourceStructures(
  sourceStructures: readonly SourceFileStructure[]
): SourceFileStructure[] {
  return Array.from(
    new Map(sourceStructures.map((structure) => [structure.path, structure])).values()
  ).sort((left, right) => left.path.localeCompare(right.path));
}

function deduplicateRelationships(
  relationships: readonly SourceRelationship[]
): SourceRelationship[] {
  return Array.from(
    new Map(
      relationships.map((relationship) => [relationshipIdentity(relationship), relationship])
    ).values()
  ).sort(compareRelationships);
}

function deduplicateDependencies(dependencies: readonly DependencyEdge[]): DependencyEdge[] {
  return Array.from(
    new Map(dependencies.map((dependency) => [dependencyIdentity(dependency), dependency])).values()
  ).sort(compareDependencies);
}

function aggregateIssues(input: {
  project: ProjectProfile;
  sourceStructures: readonly SourceFileStructure[];
  relationships: RelationshipAnalysisResult;
}): AnalysisIssue[] {
  const issues = [
    ...input.project.issues.map((issue): AnalysisIssue => ({
      stage: "PROJECT_DETECTION",
      path: issue.path,
      code: issue.code
    })),
    ...input.sourceStructures.flatMap((structure) =>
      structure.issues.map((issue): AnalysisIssue => ({
        stage: "SOURCE_STRUCTURE",
        path: structure.path,
        code: issue.code,
        message: issue.message
      }))
    ),
    ...input.relationships.issues.map((issue): AnalysisIssue => ({
      stage: "RELATIONSHIP_ANALYSIS",
      path: issue.sourcePath,
      specifier: issue.specifier,
      code: issue.code
    }))
  ];

  return Array.from(new Map(issues.map((issue) => [issueIdentity(issue), issue])).values()).sort(
    compareIssues
  );
}

function relationshipIdentity(relationship: SourceRelationship): string {
  return [
    relationship.sourcePath,
    relationship.kind,
    relationship.specifier,
    relationship.targetKind,
    relationship.targetPath ?? "",
    relationship.targetPackageName ?? ""
  ].join("\0");
}

function dependencyIdentity(dependency: DependencyEdge): string {
  return [
    dependency.sourcePath,
    dependency.kind,
    dependency.dependencyKind,
    dependency.specifier,
    dependency.targetPath ?? "",
    dependency.packageName ?? ""
  ].join("\0");
}

function issueIdentity(issue: AnalysisIssue): string {
  switch (issue.stage) {
    case "PROJECT_DETECTION":
      return [issue.stage, issue.path, issue.code].join("\0");
    case "SOURCE_STRUCTURE":
      return [issue.stage, issue.path, issue.code, issue.message].join("\0");
    case "RELATIONSHIP_ANALYSIS":
      return [issue.stage, issue.path, issue.specifier, issue.code].join("\0");
  }
}

function compareRelationships(left: SourceRelationship, right: SourceRelationship): number {
  return (
    left.sourcePath.localeCompare(right.sourcePath) ||
    left.kind.localeCompare(right.kind) ||
    left.specifier.localeCompare(right.specifier) ||
    (left.targetPath ?? "").localeCompare(right.targetPath ?? "") ||
    (left.targetPackageName ?? "").localeCompare(right.targetPackageName ?? "")
  );
}

function compareDependencies(left: DependencyEdge, right: DependencyEdge): number {
  return (
    left.sourcePath.localeCompare(right.sourcePath) ||
    left.kind.localeCompare(right.kind) ||
    left.specifier.localeCompare(right.specifier) ||
    left.dependencyKind.localeCompare(right.dependencyKind) ||
    (left.targetPath ?? "").localeCompare(right.targetPath ?? "") ||
    (left.packageName ?? "").localeCompare(right.packageName ?? "")
  );
}

function compareIssues(left: AnalysisIssue, right: AnalysisIssue): number {
  return (
    left.stage.localeCompare(right.stage) ||
    left.path.localeCompare(right.path) ||
    issueCode(left).localeCompare(issueCode(right)) ||
    issueDetail(left).localeCompare(issueDetail(right))
  );
}

function issueCode(issue: AnalysisIssue): string {
  return issue.code;
}

function issueDetail(issue: AnalysisIssue): string {
  switch (issue.stage) {
    case "PROJECT_DETECTION":
      return "";
    case "SOURCE_STRUCTURE":
      return issue.message;
    case "RELATIONSHIP_ANALYSIS":
      return issue.specifier;
  }
}
