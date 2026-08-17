import { Injectable } from "@nestjs/common";

import type { AnalysisResult } from "../../analysis/domain/contracts/analysis-result.contract.js";
import type { SourceRelationship } from "../../analysis/domain/relationships/source-relationship.js";
import type { SourceFileStructure } from "../../analysis/domain/source-structure/source-file-structure.js";
import type {
  DetectedFramework,
  PackageDependency,
  ProjectEcosystem,
  ProjectFramework,
  ProjectLanguage
} from "../../analysis/domain/project-detection/project-profile.js";
import type { ContextClaim, ContextEvidence } from "../domain/context-claim.js";
import type { ContextGenerator } from "../domain/contracts/context-generator.contract.js";
import type { ContextInput } from "../domain/contracts/context-input.contract.js";
import { ProjectContext } from "../domain/project-context.js";
import { CONTEXT_ENGINE_VERSION } from "./context-engine-version.js";

export type ProjectApplicationType = "BACKEND" | "FRONTEND" | "FULLSTACK";

type ProjectIdentityClaimValue =
  | {
      type: "APPLICATION_TYPE";
      applicationType: ProjectApplicationType;
    }
  | {
      type: "PRIMARY_LANGUAGE";
      language: ProjectLanguage;
    };

type TechnologyClaimValue =
  | {
      type: "ECOSYSTEM";
      ecosystem: ProjectEcosystem;
    }
  | {
      type: "LANGUAGE";
      language: ProjectLanguage;
      fileCount: number;
    }
  | {
      type: "FRAMEWORK";
      framework: ProjectFramework;
    }
  | {
      type: "PACKAGE_MANAGER";
      packageManager: "PNPM" | "NPM" | "YARN";
    }
  | {
      type: "DEPENDENCY";
      name: string;
      dependencyType: PackageDependency["type"];
    };

type SourceGroupClaimValue = {
  type: "SOURCE_GROUP";
  moduleId: string;
  path: string;
  sourceFileCount: number;
  declarationCount: number;
};

type ArchitectureClaimValue =
  | {
      type: "MODULE_CANDIDATE";
      moduleId: string;
      name: string;
      path: string;
      sourceFileCount: number;
      declarationCount: number;
      internalRelationshipCount: number;
      incomingRelationshipCount: number;
      outgoingRelationshipCount: number;
    }
  | {
      type: "MODULE_RELATIONSHIP";
      sourceModuleId: string;
      targetModuleId: string;
      relationshipCount: number;
    };

type ModuleCandidate = {
  moduleId: string;
  name: string;
  path: string;
  sourceStructures: SourceFileStructure[];
  declarationCount: number;
  internalRelationships: SourceRelationship[];
  incomingRelationships: SourceRelationship[];
  outgoingRelationships: SourceRelationship[];
};

type ModuleRelationship = {
  sourceModuleId: string;
  targetModuleId: string;
  relationships: SourceRelationship[];
};

@Injectable()
export class DeterministicContextGenerator implements ContextGenerator {
  async generate(input: ContextInput): Promise<ProjectContext> {
    const analysis = input.analysis;
    const modules = this.moduleCandidates(analysis);

    return ProjectContext.create({
      contextId: this.contextId(analysis),
      analysisId: analysis.analysisId,
      scanId: analysis.scanId,
      repositoryId: analysis.repositoryId,
      commitSha: analysis.commitSha,
      contextVersion: CONTEXT_ENGINE_VERSION,
      generatedAt: new Date(),
      project: {
        claims: this.projectClaims(analysis)
      },
      technology: {
        claims: this.technologyClaims(analysis)
      },
      structure: {
        claims: this.structureClaims(modules)
      },
      architecture: {
        claims: this.architectureClaims(modules, this.moduleRelationships(analysis, modules))
      }
    });
  }

  private contextId(analysis: AnalysisResult): string {
    return `context:${analysis.analysisId}:${CONTEXT_ENGINE_VERSION}`;
  }

  private projectClaims(analysis: AnalysisResult): ContextClaim<ProjectIdentityClaimValue>[] {
    return [...this.applicationTypeClaims(analysis), ...this.primaryLanguageClaims(analysis)];
  }

  private technologyClaims(analysis: AnalysisResult): ContextClaim<TechnologyClaimValue>[] {
    return [
      ...this.ecosystemClaims(analysis),
      ...this.languageClaims(analysis),
      ...this.frameworkClaims(analysis),
      ...this.packageManagerClaims(analysis),
      ...this.dependencyClaims(analysis)
    ];
  }

  private structureClaims(
    modules: readonly ModuleCandidate[]
  ): ContextClaim<SourceGroupClaimValue>[] {
    return modules.map((module) => ({
      value: {
        type: "SOURCE_GROUP",
        moduleId: module.moduleId,
        path: module.path,
        sourceFileCount: module.sourceStructures.length,
        declarationCount: module.declarationCount
      },
      kind: "OBSERVED",
      confidence: "HIGH",
      evidence: sourceStructureEvidence(module.sourceStructures)
    }));
  }

  private architectureClaims(
    modules: readonly ModuleCandidate[],
    moduleRelationships: readonly ModuleRelationship[]
  ): ContextClaim<ArchitectureClaimValue>[] {
    return [
      ...modules.map((module) => ({
        value: {
          type: "MODULE_CANDIDATE" as const,
          moduleId: module.moduleId,
          name: module.name,
          path: module.path,
          sourceFileCount: module.sourceStructures.length,
          declarationCount: module.declarationCount,
          internalRelationshipCount: module.internalRelationships.length,
          incomingRelationshipCount: module.incomingRelationships.length,
          outgoingRelationshipCount: module.outgoingRelationships.length
        },
        kind: "INFERRED" as const,
        confidence: moduleConfidence(module),
        evidence: [
          ...sourceStructureEvidence(module.sourceStructures),
          ...relationshipEvidence(module.internalRelationships)
        ].sort(compareEvidence)
      })),
      ...moduleRelationships.map((relationship) => ({
        value: {
          type: "MODULE_RELATIONSHIP" as const,
          sourceModuleId: relationship.sourceModuleId,
          targetModuleId: relationship.targetModuleId,
          relationshipCount: relationship.relationships.length
        },
        kind: "INFERRED" as const,
        confidence: relationship.relationships.length > 1 ? ("HIGH" as const) : ("MEDIUM" as const),
        evidence: relationshipEvidence(relationship.relationships)
      }))
    ];
  }

  private applicationTypeClaims(
    analysis: AnalysisResult
  ): ContextClaim<ProjectIdentityClaimValue>[] {
    const frameworks = new Set(analysis.project.frameworks.map((framework) => framework.framework));
    const hasBackend = frameworks.has("NESTJS");
    const hasFrontend = frameworks.has("REACT") || frameworks.has("NEXT_JS");

    if (!hasBackend && !hasFrontend) {
      return [];
    }

    const applicationType: ProjectApplicationType =
      hasBackend && hasFrontend ? "FULLSTACK" : hasBackend ? "BACKEND" : "FRONTEND";

    return [
      {
        value: {
          type: "APPLICATION_TYPE",
          applicationType
        },
        kind: "INFERRED",
        confidence: "MEDIUM",
        evidence: this.frameworkEvidence(analysis.project.frameworks)
      }
    ];
  }

  private primaryLanguageClaims(
    analysis: AnalysisResult
  ): ContextClaim<ProjectIdentityClaimValue>[] {
    if (analysis.project.languages.length === 0) {
      return [];
    }

    const sortedLanguages = [...analysis.project.languages].sort(
      (left, right) =>
        right.fileCount - left.fileCount || left.language.localeCompare(right.language)
    );
    const [primary, secondary] = sortedLanguages;

    if (!primary) {
      return [];
    }

    const hasTie = secondary !== undefined && secondary.fileCount === primary.fileCount;

    return [
      {
        value: {
          type: "PRIMARY_LANGUAGE",
          language: primary.language
        },
        kind: "INFERRED",
        confidence: hasTie ? "MEDIUM" : "HIGH",
        evidence: [projectMetadataEvidence("project.languages")]
      }
    ];
  }

  private ecosystemClaims(analysis: AnalysisResult): ContextClaim<TechnologyClaimValue>[] {
    return [...analysis.project.ecosystems].sort().map((ecosystem) => ({
      value: {
        type: "ECOSYSTEM",
        ecosystem
      },
      kind: "OBSERVED",
      confidence: "HIGH",
      evidence: [projectMetadataEvidence("project.ecosystems")]
    }));
  }

  private languageClaims(analysis: AnalysisResult): ContextClaim<TechnologyClaimValue>[] {
    return [...analysis.project.languages]
      .sort(
        (left, right) =>
          right.fileCount - left.fileCount || left.language.localeCompare(right.language)
      )
      .map((language) => ({
        value: {
          type: "LANGUAGE",
          language: language.language,
          fileCount: language.fileCount
        },
        kind: "OBSERVED",
        confidence: "HIGH",
        evidence: [projectMetadataEvidence("project.languages")]
      }));
  }

  private frameworkClaims(analysis: AnalysisResult): ContextClaim<TechnologyClaimValue>[] {
    return [...analysis.project.frameworks]
      .sort((left, right) => left.framework.localeCompare(right.framework))
      .map((framework) => ({
        value: {
          type: "FRAMEWORK",
          framework: framework.framework
        },
        kind: "OBSERVED",
        confidence: "HIGH",
        evidence: [
          projectMetadataEvidence("project.frameworks"),
          ...framework.evidence.map((evidence) => frameworkEvidenceReference(evidence))
        ].sort(compareEvidence)
      }));
  }

  private packageManagerClaims(analysis: AnalysisResult): ContextClaim<TechnologyClaimValue>[] {
    const packageManager = analysis.project.packageManager;

    if (packageManager.status !== "DETECTED") {
      return [];
    }

    return [
      {
        value: {
          type: "PACKAGE_MANAGER",
          packageManager: packageManager.packageManager
        },
        kind: "OBSERVED",
        confidence: "HIGH",
        evidence: [
          projectMetadataEvidence("project.packageManager"),
          ...packageManager.evidence.map((path) => manifestEvidence(path))
        ].sort(compareEvidence)
      }
    ];
  }

  private dependencyClaims(analysis: AnalysisResult): ContextClaim<TechnologyClaimValue>[] {
    return [...analysis.project.dependencies]
      .filter((dependency) => dependency.type === "DEPENDENCY")
      .sort(compareDependencies)
      .map((dependency) => ({
        value: {
          type: "DEPENDENCY",
          name: dependency.name,
          dependencyType: dependency.type
        },
        kind: "OBSERVED",
        confidence: "HIGH",
        evidence: [dependencyEvidence(dependency)]
      }));
  }

  private frameworkEvidence(frameworks: readonly DetectedFramework[]): ContextEvidence[] {
    return [
      projectMetadataEvidence("project.frameworks"),
      ...frameworks.flatMap((framework) =>
        framework.evidence.map((evidence) => frameworkEvidenceReference(evidence))
      )
    ].sort(compareEvidence);
  }

  private moduleCandidates(analysis: AnalysisResult): ModuleCandidate[] {
    const structuresByModule = new Map<string, SourceFileStructure[]>();

    for (const structure of analysis.sourceStructures) {
      const path = modulePathForSourcePath(structure.path);

      if (!path) {
        continue;
      }

      structuresByModule.set(path, [...(structuresByModule.get(path) ?? []), structure]);
    }

    const relationshipsByModule = this.relationshipsByModule(analysis.relationships);
    const candidates = [...structuresByModule.entries()].flatMap(([path, structures]) => {
      const sortedStructures = [...structures].sort((left, right) =>
        left.path.localeCompare(right.path)
      );
      const internalRelationships = relationshipsByModule.internal.get(path) ?? [];
      const incomingRelationships = relationshipsByModule.incoming.get(path) ?? [];
      const outgoingRelationships = relationshipsByModule.outgoing.get(path) ?? [];
      const declarationCount = sortedStructures.reduce(
        (count, structure) => count + structure.declarations.length,
        0
      );

      if (!isMeaningfulModuleCandidate(sortedStructures, declarationCount, internalRelationships)) {
        return [];
      }

      return [
        {
          moduleId: moduleId(path),
          name: moduleName(path),
          path,
          sourceStructures: sortedStructures,
          declarationCount,
          internalRelationships,
          incomingRelationships,
          outgoingRelationships
        }
      ];
    });

    return candidates.sort((left, right) => left.path.localeCompare(right.path));
  }

  private relationshipsByModule(relationships: readonly SourceRelationship[]): {
    internal: Map<string, SourceRelationship[]>;
    incoming: Map<string, SourceRelationship[]>;
    outgoing: Map<string, SourceRelationship[]>;
  } {
    const internal = new Map<string, SourceRelationship[]>();
    const incoming = new Map<string, SourceRelationship[]>();
    const outgoing = new Map<string, SourceRelationship[]>();

    for (const relationship of relationships) {
      if (
        !relationship.resolved ||
        relationship.targetKind !== "LOCAL_FILE" ||
        !relationship.targetPath
      ) {
        continue;
      }

      const sourceModule = modulePathForSourcePath(relationship.sourcePath);
      const targetModule = modulePathForSourcePath(relationship.targetPath);

      if (!sourceModule || !targetModule) {
        continue;
      }

      if (sourceModule === targetModule) {
        appendRelationship(internal, sourceModule, relationship);
        continue;
      }

      appendRelationship(outgoing, sourceModule, relationship);
      appendRelationship(incoming, targetModule, relationship);
    }

    sortRelationshipMap(internal);
    sortRelationshipMap(incoming);
    sortRelationshipMap(outgoing);

    return { internal, incoming, outgoing };
  }

  private moduleRelationships(
    analysis: AnalysisResult,
    modules: readonly ModuleCandidate[]
  ): ModuleRelationship[] {
    const modulePaths = new Set(modules.map((module) => module.path));
    const relationshipsByPair = new Map<string, SourceRelationship[]>();

    for (const relationship of analysis.relationships) {
      if (
        !relationship.resolved ||
        relationship.targetKind !== "LOCAL_FILE" ||
        !relationship.targetPath
      ) {
        continue;
      }

      const sourceModule = modulePathForSourcePath(relationship.sourcePath);
      const targetModule = modulePathForSourcePath(relationship.targetPath);

      if (
        !sourceModule ||
        !targetModule ||
        sourceModule === targetModule ||
        !modulePaths.has(sourceModule) ||
        !modulePaths.has(targetModule)
      ) {
        continue;
      }

      const key = `${sourceModule}\0${targetModule}`;
      relationshipsByPair.set(key, [...(relationshipsByPair.get(key) ?? []), relationship]);
    }

    return [...relationshipsByPair.entries()]
      .map(([key, relationships]) => {
        const [sourceModulePath, targetModulePath] = key.split("\0");

        return {
          sourceModuleId: moduleId(sourceModulePath ?? ""),
          targetModuleId: moduleId(targetModulePath ?? ""),
          relationships: relationships.sort(compareRelationships)
        };
      })
      .sort(
        (left, right) =>
          left.sourceModuleId.localeCompare(right.sourceModuleId) ||
          left.targetModuleId.localeCompare(right.targetModuleId)
      );
  }
}

function modulePathForSourcePath(path: string): string | null {
  const segments = path.split("/").filter(Boolean);
  const sourceRootIndex = segments.indexOf("src");

  if (sourceRootIndex >= 0) {
    const moduleSegment = segments[sourceRootIndex + 1];

    return moduleSegment ? segments.slice(0, sourceRootIndex + 2).join("/") : null;
  }

  const firstSegment = segments[0];

  return segments.length > 1 && firstSegment ? firstSegment : null;
}

function isMeaningfulModuleCandidate(
  sourceStructures: readonly SourceFileStructure[],
  declarationCount: number,
  internalRelationships: readonly SourceRelationship[]
): boolean {
  return (
    sourceStructures.length >= 2 && (internalRelationships.length > 0 || declarationCount >= 2)
  );
}

function moduleConfidence(module: ModuleCandidate): "HIGH" | "MEDIUM" {
  return module.internalRelationships.length >= 2 && module.declarationCount >= 2
    ? "HIGH"
    : "MEDIUM";
}

function moduleId(path: string): string {
  return `module:${path}`;
}

function moduleName(path: string): string {
  return path.split("/").at(-1) ?? path;
}

function appendRelationship(
  relationshipsByModule: Map<string, SourceRelationship[]>,
  modulePath: string,
  relationship: SourceRelationship
): void {
  relationshipsByModule.set(modulePath, [
    ...(relationshipsByModule.get(modulePath) ?? []),
    relationship
  ]);
}

function sortRelationshipMap(relationshipsByModule: Map<string, SourceRelationship[]>): void {
  for (const [modulePath, relationships] of relationshipsByModule.entries()) {
    relationshipsByModule.set(modulePath, relationships.sort(compareRelationships));
  }
}

function projectMetadataEvidence(field: string): ContextEvidence {
  return {
    kind: "PROJECT_METADATA",
    reference: {
      kind: "PROJECT_METADATA",
      field
    }
  };
}

function manifestEvidence(path: string): ContextEvidence {
  return {
    kind: "MANIFEST",
    reference: {
      kind: "MANIFEST",
      path
    }
  };
}

function dependencyEvidence(dependency: PackageDependency): ContextEvidence {
  return {
    kind: "DEPENDENCY",
    reference: {
      kind: "DEPENDENCY",
      manifestPath: dependency.manifestPath,
      name: dependency.name
    }
  };
}

function sourceStructureEvidence(
  sourceStructures: readonly SourceFileStructure[]
): ContextEvidence[] {
  return sourceStructures.slice(0, 3).map((structure) => ({
    kind: "SOURCE_STRUCTURE",
    reference: {
      kind: "SOURCE_STRUCTURE",
      path: structure.path
    }
  }));
}

function relationshipEvidence(relationships: readonly SourceRelationship[]): ContextEvidence[] {
  return relationships.slice(0, 3).map((relationship) => ({
    kind: "RELATIONSHIP",
    reference: {
      kind: "RELATIONSHIP",
      sourcePath: relationship.sourcePath,
      specifier: relationship.specifier
    }
  }));
}

function frameworkEvidenceReference(evidence: string): ContextEvidence {
  const separatorIndex = evidence.lastIndexOf(":");

  if (separatorIndex <= 0 || separatorIndex === evidence.length - 1) {
    return projectMetadataEvidence("project.frameworks.evidence");
  }

  return {
    kind: "DEPENDENCY",
    reference: {
      kind: "DEPENDENCY",
      manifestPath: evidence.slice(0, separatorIndex),
      name: evidence.slice(separatorIndex + 1)
    }
  };
}

function compareDependencies(left: PackageDependency, right: PackageDependency): number {
  return (
    left.manifestPath.localeCompare(right.manifestPath) ||
    left.name.localeCompare(right.name) ||
    left.type.localeCompare(right.type)
  );
}

function compareEvidence(left: ContextEvidence, right: ContextEvidence): number {
  return JSON.stringify(left).localeCompare(JSON.stringify(right));
}

function compareRelationships(left: SourceRelationship, right: SourceRelationship): number {
  return (
    left.sourcePath.localeCompare(right.sourcePath) ||
    left.specifier.localeCompare(right.specifier) ||
    (left.targetPath ?? "").localeCompare(right.targetPath ?? "")
  );
}
