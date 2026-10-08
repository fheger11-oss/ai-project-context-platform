import type {
  ArchitecturalModule,
  ArchitectureDependency
} from "../domain/project-context-architecture.js";
import type {
  ProjectContextSemantic,
  SemanticRelationship
} from "../domain/project-context-semantic.js";
import {
  ownershipForFile,
  projectCanonicalFileOwnership
} from "./project-context-module-ownership.js";

type DependencyAccumulator = {
  sourceModuleId: string;
  targetModuleId: string;
  relationshipIds: Set<string>;
  sourceFileIds: Set<string>;
  targetFileIds: Set<string>;
  relationshipKinds: Set<SemanticRelationship["kind"]>;
};

const RELATIONSHIP_KIND_ORDER: Readonly<Record<SemanticRelationship["kind"], number>> = {
  IMPORTS: 0,
  RE_EXPORTS: 1
};

export function projectArchitectureDependencies(
  semantic: ProjectContextSemantic,
  modules: readonly ArchitecturalModule[]
): ArchitectureDependency[] {
  const ownership = projectCanonicalFileOwnership(modules);
  const modulesById = new Map(modules.map((module) => [module.id, module]));
  const workspaceModulesByPackageId = new Map(
    modules
      .filter((module) => module.kind === "WORKSPACE_PACKAGE")
      .map((module) => [module.packageId, module])
  );
  const packagesById = new Map(
    semantic.packages.map((semanticPackage) => [semanticPackage.id, semanticPackage])
  );
  const packagesByName = groupPackagesByName(semantic);
  const dependencies = new Map<string, DependencyAccumulator>();

  for (const relationship of semantic.relationships) {
    if (!relationship.resolved) continue;
    const sourceOwnership = ownershipForFile(ownership, relationship.sourceFileId);
    if (sourceOwnership.status !== "OWNED") continue;
    const sourceModule = modulesById.get(sourceOwnership.moduleId);
    if (!sourceModule) continue;

    if (relationship.targetKind === "LOCAL_FILE" && relationship.targetFileId) {
      const targetOwnership = ownershipForFile(ownership, relationship.targetFileId);
      if (targetOwnership.status !== "OWNED") continue;
      addDependency(dependencies, relationship, sourceModule.id, targetOwnership.moduleId);
      continue;
    }

    if (relationship.targetKind !== "PACKAGE" || !relationship.targetPackageName) continue;
    const targetPackages = packagesByName.get(relationship.targetPackageName) ?? [];
    if (targetPackages.length !== 1) continue;
    const targetPackage = targetPackages[0];
    if (!targetPackage) continue;
    const sourcePackage = packagesById.get(sourceModule.packageId);
    if (
      !sourcePackage?.dependencies.some(
        (dependency) => dependency.name === relationship.targetPackageName
      )
    ) {
      continue;
    }
    const targetModule = workspaceModulesByPackageId.get(targetPackage.id);
    if (!targetModule) continue;
    addDependency(dependencies, relationship, sourceModule.id, targetModule.id);
  }

  return [...dependencies.values()]
    .map(toDependency)
    .sort((left, right) => left.id.localeCompare(right.id));
}

function groupPackagesByName(
  semantic: ProjectContextSemantic
): Map<string, ProjectContextSemantic["packages"][number][]> {
  const grouped = new Map<string, ProjectContextSemantic["packages"][number][]>();
  for (const semanticPackage of semantic.packages) {
    if (!semanticPackage.name) continue;
    grouped.set(semanticPackage.name, [
      ...(grouped.get(semanticPackage.name) ?? []),
      semanticPackage
    ]);
  }
  return grouped;
}

function addDependency(
  dependencies: Map<string, DependencyAccumulator>,
  relationship: SemanticRelationship,
  sourceModuleId: string,
  targetModuleId: string
): void {
  if (sourceModuleId === targetModuleId) return;
  const id = dependencyId(sourceModuleId, targetModuleId);
  const dependency = dependencies.get(id) ?? {
    sourceModuleId,
    targetModuleId,
    relationshipIds: new Set<string>(),
    sourceFileIds: new Set<string>(),
    targetFileIds: new Set<string>(),
    relationshipKinds: new Set<SemanticRelationship["kind"]>()
  };
  dependency.relationshipIds.add(relationship.id);
  dependency.sourceFileIds.add(relationship.sourceFileId);
  if (relationship.targetFileId) dependency.targetFileIds.add(relationship.targetFileId);
  dependency.relationshipKinds.add(relationship.kind);
  dependencies.set(id, dependency);
}

function toDependency(value: DependencyAccumulator): ArchitectureDependency {
  const id = dependencyId(value.sourceModuleId, value.targetModuleId);
  const relationshipIds = [...value.relationshipIds].sort();
  return {
    id,
    sourceModuleId: value.sourceModuleId,
    targetModuleId: value.targetModuleId,
    relationshipCount: relationshipIds.length,
    sourceFileCount: value.sourceFileIds.size,
    targetFileCount: value.targetFileIds.size,
    relationshipKinds: [...value.relationshipKinds].sort(
      (left, right) => RELATIONSHIP_KIND_ORDER[left] - RELATIONSHIP_KIND_ORDER[right]
    ),
    relationshipIds,
    resolution: "RESOLVED"
  };
}

function dependencyId(sourceModuleId: string, targetModuleId: string): string {
  return `architecture-dependency:${encodeURIComponent(
    JSON.stringify([sourceModuleId, targetModuleId])
  )}`;
}
