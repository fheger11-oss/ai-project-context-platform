import type { ArchitecturalModule } from "../domain/project-context-architecture.js";

export type CanonicalModuleOwnership =
  | { status: "OWNED"; moduleId: string }
  | { status: "AMBIGUOUS"; moduleIds: readonly string[] }
  | { status: "UNMAPPED" };

export function projectCanonicalFileOwnership(
  modules: readonly ArchitecturalModule[]
): ReadonlyMap<string, CanonicalModuleOwnership> {
  const candidatesByFile = new Map<string, ArchitecturalModule[]>();

  for (const module of modules) {
    for (const fileId of module.fileIds) {
      candidatesByFile.set(fileId, [...(candidatesByFile.get(fileId) ?? []), module]);
    }
  }

  return new Map(
    [...candidatesByFile.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([fileId, candidates]) => [fileId, canonicalOwnership(candidates)])
  );
}

export function ownershipForFile(
  ownership: ReadonlyMap<string, CanonicalModuleOwnership>,
  fileId: string
): CanonicalModuleOwnership {
  return ownership.get(fileId) ?? { status: "UNMAPPED" };
}

function canonicalOwnership(candidates: readonly ArchitecturalModule[]): CanonicalModuleOwnership {
  const ordered = [...candidates].sort(compareSpecificity);
  const mostSpecific = ordered[0];
  if (!mostSpecific) return { status: "UNMAPPED" };

  const equallySpecific = ordered
    .filter((candidate) => sameSpecificity(candidate, mostSpecific))
    .map((candidate) => candidate.id)
    .sort();

  return equallySpecific.length === 1
    ? { status: "OWNED", moduleId: mostSpecific.id }
    : { status: "AMBIGUOUS", moduleIds: equallySpecific };
}

function compareSpecificity(left: ArchitecturalModule, right: ArchitecturalModule): number {
  return (
    childRank(right) - childRank(left) ||
    pathDepth(right.rootPath) - pathDepth(left.rootPath) ||
    right.rootPath.length - left.rootPath.length ||
    left.id.localeCompare(right.id)
  );
}

function sameSpecificity(left: ArchitecturalModule, right: ArchitecturalModule): boolean {
  return (
    childRank(left) === childRank(right) &&
    pathDepth(left.rootPath) === pathDepth(right.rootPath) &&
    left.rootPath.length === right.rootPath.length
  );
}

function childRank(module: ArchitecturalModule): number {
  return module.kind === "WORKSPACE_PACKAGE" ? 0 : 1;
}

function pathDepth(path: string): number {
  return path === "." ? 0 : path.split("/").filter(Boolean).length;
}
