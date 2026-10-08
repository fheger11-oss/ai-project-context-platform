import { comparePackagePublicSurfaceDeclarations } from "../../analysis/domain/project-detection/project-profile.js";
import type {
  ArchitecturalModule,
  ArchitecturePublicSurface,
  ArchitecturePublicSurfaceDeclarationReference
} from "../domain/project-context-architecture.js";
import type {
  ProjectContextSemantic,
  SemanticFile,
  SemanticPackage
} from "../domain/project-context-semantic.js";
import {
  ownershipForFile,
  projectCanonicalFileOwnership
} from "./project-context-module-ownership.js";

export function projectArchitecturePublicSurfaces(
  semantic: ProjectContextSemantic,
  modules: readonly ArchitecturalModule[]
): readonly ArchitecturePublicSurface[] {
  const filesByPath = new Map(semantic.files.map((file) => [file.path, file]));
  const exportIdsByFile = exportsByFile(semantic);
  const ownership = projectCanonicalFileOwnership(modules);
  const surfaces = new Map<string, ArchitecturePublicSurface>();

  for (const semanticPackage of [...semantic.packages].sort((left, right) =>
    left.id.localeCompare(right.id)
  )) {
    const declarations = [...semanticPackage.publicSurfaceDeclarations].sort(
      comparePackagePublicSurfaceDeclarations
    );
    const grouped = new Map<string, typeof declarations>();

    for (const declaration of declarations) {
      const subpath = canonicalSubpath(declaration.subpath);
      grouped.set(subpath, [...(grouped.get(subpath) ?? []), declaration]);
    }

    for (const [subpath, surfaceDeclarations] of [...grouped].sort(([left], [right]) =>
      left.localeCompare(right)
    )) {
      const projected = surfaceDeclarations.map((declaration) =>
        projectDeclaration(semanticPackage, declaration, filesByPath, exportIdsByFile, ownership)
      );
      const surface: ArchitecturePublicSurface = {
        id: structuredId("architecture-public-surface", [semanticPackage.id, subpath]),
        packageId: semanticPackage.id,
        subpath,
        status: aggregateStatus(projected),
        declarations: projected
      };
      surfaces.set(surface.id, surface);
    }
  }

  return [...surfaces.values()].sort(
    (left, right) =>
      left.packageId.localeCompare(right.packageId) || left.subpath.localeCompare(right.subpath)
  );
}

function projectDeclaration(
  semanticPackage: SemanticPackage,
  declaration: SemanticPackage["publicSurfaceDeclarations"][number],
  filesByPath: ReadonlyMap<string, SemanticFile>,
  exportIdsByFile: ReadonlyMap<string, readonly string[]>,
  ownership: ReturnType<typeof projectCanonicalFileOwnership>
): ArchitecturePublicSurfaceDeclarationReference {
  const declarationId = structuredId("architecture-public-surface-declaration", [
    semanticPackage.id,
    declaration.sourceField,
    declaration.subpath,
    declaration.selectorPath,
    declaration.disposition,
    declaration.declaredTarget
  ]);
  const common = {
    declarationId,
    sourceField: declaration.sourceField,
    selectorPath: declaration.selectorPath.map((selector) => ({ ...selector })),
    disposition: declaration.disposition,
    declaredTarget: declaration.declaredTarget
  };

  if (declaration.disposition === "BLOCKED" || declaration.declaredTarget === null) {
    return {
      ...common,
      resolution: "BLOCKED",
      targetFileId: null,
      targetModuleId: null,
      sourceExportIds: []
    };
  }

  const targetPath = exactTargetPath(semanticPackage.manifestPath, declaration.declaredTarget);
  const targetFile = targetPath ? filesByPath.get(targetPath) : undefined;
  if (!targetFile) {
    return {
      ...common,
      resolution: "UNRESOLVED",
      targetFileId: null,
      targetModuleId: null,
      sourceExportIds: []
    };
  }

  const targetOwnership = ownershipForFile(ownership, targetFile.id);
  return {
    ...common,
    resolution: "RESOLVED",
    targetFileId: targetFile.id,
    targetModuleId: targetOwnership.status === "OWNED" ? targetOwnership.moduleId : null,
    sourceExportIds: exportIdsByFile.get(targetFile.id) ?? []
  };
}

function exportsByFile(semantic: ProjectContextSemantic): ReadonlyMap<string, readonly string[]> {
  const result = new Map<string, string[]>();
  for (const sourceExport of semantic.exports) {
    result.set(sourceExport.fileId, [...(result.get(sourceExport.fileId) ?? []), sourceExport.id]);
  }
  for (const [fileId, exportIds] of result) result.set(fileId, exportIds.sort());
  return result;
}

function exactTargetPath(manifestPath: string, declaredTarget: string): string | null {
  const target = declaredTarget.replaceAll("\\", "/");
  if (
    target.includes("*") ||
    target.startsWith("/") ||
    /^[A-Za-z]:\//.test(target) ||
    /^[A-Za-z][A-Za-z0-9+.-]*:/.test(target)
  ) {
    return null;
  }

  const targetSegments: string[] = [];
  for (const segment of target.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      if (targetSegments.length === 0) return null;
      targetSegments.pop();
    } else {
      targetSegments.push(segment);
    }
  }
  if (targetSegments.length === 0) return null;

  const manifestSegments = manifestPath.replaceAll("\\", "/").split("/").filter(Boolean);
  const packageRoot = manifestSegments.slice(0, -1);
  return [...packageRoot, ...targetSegments].join("/");
}

function aggregateStatus(
  declarations: readonly ArchitecturePublicSurfaceDeclarationReference[]
): ArchitecturePublicSurface["status"] {
  if (declarations.every((declaration) => declaration.resolution === "BLOCKED")) return "BLOCKED";
  const resolved = declarations.filter((declaration) => declaration.resolution === "RESOLVED");
  if (resolved.length === declarations.length) return "RESOLVED";
  if (resolved.length > 0) return "PARTIAL";
  return "UNRESOLVED";
}

function canonicalSubpath(subpath: string): string {
  return subpath === "." ? "." : subpath.replaceAll("\\", "/");
}

function structuredId(kind: string, components: readonly unknown[]): string {
  return `${kind}:${encodeURIComponent(JSON.stringify(components))}`;
}
