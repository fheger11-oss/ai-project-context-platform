import type {
  ArchitecturalModule,
  ArchitectureFrameworkSignal,
  ArchitectureLayerKind,
  ArchitectureModuleEvidence,
  ArchitectureModuleKind,
  ProjectContextArchitectureModel
} from "../domain/project-context-architecture.js";
import type {
  ProjectContextSemantic,
  SemanticExport,
  SemanticFile,
  SemanticImport,
  SemanticPackage,
  SemanticSymbol
} from "../domain/project-context-semantic.js";
import { projectArchitectureDependencies } from "./project-context-dependency.projector.js";

const LAYER_ORDER: readonly ArchitectureLayerKind[] = [
  "DOMAIN",
  "APPLICATION",
  "INFRASTRUCTURE",
  "PRESENTATION",
  "UNCLASSIFIED"
];

type PackageScope = {
  package: SemanticPackage;
  rootPath: string;
  moduleId: string;
  files: SemanticFile[];
};

type ModuleCandidate = {
  kind: Exclude<ArchitectureModuleKind, "WORKSPACE_PACKAGE">;
  name: string;
  rootPath: string;
  packageScope: PackageScope;
  files: SemanticFile[];
};

export function projectContextArchitecture(
  semantic: ProjectContextSemantic
): ProjectContextArchitectureModel {
  const packageScopes = packageScopesWithOwnedFiles(semantic);
  const workspaceModules = packageScopes.map((scope) => workspacePackageModule(scope, semantic));
  const childModules = packageScopes.flatMap((scope) => childModuleCandidates(scope, semantic));

  const modules = [...workspaceModules, ...childModules].sort(compareModules);

  return {
    modules,
    dependencies: projectArchitectureDependencies(semantic, modules)
  };
}

function packageScopesWithOwnedFiles(semantic: ProjectContextSemantic): PackageScope[] {
  const scopes: PackageScope[] = semantic.packages.map((semanticPackage) => {
    const rootPath = packageRoot(semanticPackage.manifestPath);
    return {
      package: semanticPackage,
      rootPath,
      moduleId: moduleId("WORKSPACE_PACKAGE", displayRoot(rootPath), semanticPackage.id),
      files: []
    };
  });
  const ownershipOrder = [...scopes].sort(
    (left, right) =>
      right.rootPath.length - left.rootPath.length ||
      left.package.manifestPath.localeCompare(right.package.manifestPath)
  );

  for (const file of semantic.files) {
    const owner = ownershipOrder.find((scope) => pathBelongsToRoot(file.path, scope.rootPath));
    owner?.files.push(file);
  }
  for (const scope of scopes)
    scope.files.sort((left, right) => left.path.localeCompare(right.path));

  return scopes.sort((left, right) =>
    left.package.manifestPath.localeCompare(right.package.manifestPath)
  );
}

function workspacePackageModule(
  scope: PackageScope,
  semantic: ProjectContextSemantic
): ArchitecturalModule {
  const rootPath = displayRoot(scope.rootPath);
  return moduleRecord({
    id: scope.moduleId,
    kind: "WORKSPACE_PACKAGE",
    name: scope.package.name ?? rootName(rootPath),
    rootPath,
    packageId: scope.package.id,
    parentModuleId: null,
    files: scope.files,
    semantic,
    inference: "OBSERVED",
    confidence: "HIGH",
    evidence: [
      {
        kind: "PACKAGE_MANIFEST",
        packageId: scope.package.id,
        manifestPath: scope.package.manifestPath
      }
    ],
    frameworkSignals: []
  });
}

function childModuleCandidates(
  scope: PackageScope,
  semantic: ProjectContextSemantic
): ArchitecturalModule[] {
  const candidates = new Map<string, ModuleCandidate>();

  for (const file of scope.files) {
    const relativePath = pathRelativeToRoot(file.path, scope.rootPath);
    const detected = candidateForRelativePath(relativePath, scope);
    if (!detected) continue;
    const key = `${detected.kind}\0${detected.rootPath}`;
    const existing = candidates.get(key);
    if (existing) existing.files.push(file);
    else candidates.set(key, { ...detected, files: [file] });
  }

  return [...candidates.values()]
    .filter((candidate) => isConservativeCandidate(candidate, semantic))
    .map((candidate) => childModule(candidate, semantic))
    .sort(compareModules);
}

function candidateForRelativePath(
  relativePath: string,
  packageScope: PackageScope
): Omit<ModuleCandidate, "files"> | null {
  const segments = relativePath.split("/").filter(Boolean);
  if (segments[0] !== "src") return null;

  if (segments[1] === "modules" && segments[2]) {
    return candidate("BACKEND_FEATURE", segments[2], packageScope, ["src", "modules", segments[2]]);
  }
  if (segments[1] === "features" && segments[2]) {
    return candidate("FRONTEND_FEATURE", segments[2], packageScope, [
      "src",
      "features",
      segments[2]
    ]);
  }
  if (
    (segments[1] === "shared" || segments[1] === "components" || segments[1] === "lib") &&
    segments[2]
  ) {
    return candidate("SHARED_AREA", segments[1], packageScope, ["src", segments[1]]);
  }
  return null;
}

function candidate(
  kind: ModuleCandidate["kind"],
  name: string,
  packageScope: PackageScope,
  relativeRoot: readonly string[]
): Omit<ModuleCandidate, "files"> {
  return {
    kind,
    name,
    rootPath: joinPath(packageScope.rootPath, relativeRoot.join("/")),
    packageScope
  };
}

function isConservativeCandidate(
  candidate: ModuleCandidate,
  semantic: ProjectContextSemantic
): boolean {
  if (candidate.kind !== "SHARED_AREA") return true;
  if (candidate.files.length < 2) return false;
  const fileIds = new Set(candidate.files.map((file) => file.id));
  return semantic.exports.some((sourceExport) => fileIds.has(sourceExport.fileId));
}

function childModule(
  candidate: ModuleCandidate,
  semantic: ProjectContextSemantic
): ArchitecturalModule {
  const frameworkSignals =
    candidate.kind === "BACKEND_FEATURE" ? nestJsModuleSignals(candidate.files, semantic) : [];
  const hasStrongFrameworkSignal = frameworkSignals.some(
    (signal) => signal.inference === "STRONGLY_INFERRED"
  );
  const sourceExports = exportsForFiles(candidate.files, semantic.exports);
  const evidence: ArchitectureModuleEvidence[] = [
    {
      kind: "DIRECTORY_CONVENTION",
      convention:
        candidate.kind === "BACKEND_FEATURE"
          ? "BACKEND_MODULES"
          : candidate.kind === "FRONTEND_FEATURE"
            ? "FRONTEND_FEATURES"
            : "SHARED_SOURCE_AREA",
      rootPath: candidate.rootPath
    },
    ...(candidate.kind === "SHARED_AREA"
      ? candidate.files.map((file) => ({ kind: "SOURCE_FILE" as const, fileId: file.id }))
      : []),
    ...(candidate.kind === "SHARED_AREA"
      ? sourceExports.map((sourceExport) => ({
          kind: "SOURCE_EXPORT" as const,
          exportId: sourceExport.exportId,
          fileId: sourceExport.fileId
        }))
      : []),
    ...frameworkSignals.flatMap((signal): ArchitectureModuleEvidence[] => [
      { kind: "SOURCE_FILE", fileId: signal.fileId },
      ...signal.symbolIds.map((symbolId) => ({
        kind: "SOURCE_SYMBOL" as const,
        symbolId,
        fileId: signal.fileId
      })),
      ...signal.importIds.map((importId) => ({
        kind: "SOURCE_IMPORT" as const,
        importId,
        fileId: signal.fileId
      }))
    ])
  ];

  return moduleRecord({
    id: moduleId(candidate.kind, candidate.rootPath, candidate.packageScope.package.id),
    kind: candidate.kind,
    name: candidate.name,
    rootPath: candidate.rootPath,
    packageId: candidate.packageScope.package.id,
    parentModuleId: candidate.packageScope.moduleId,
    files: candidate.files,
    semantic,
    inference: hasStrongFrameworkSignal ? "STRONGLY_INFERRED" : "INFERRED",
    confidence: hasStrongFrameworkSignal ? "HIGH" : "MEDIUM",
    evidence,
    frameworkSignals
  });
}

function moduleRecord(input: {
  id: string;
  kind: ArchitectureModuleKind;
  name: string;
  rootPath: string;
  packageId: string;
  parentModuleId: string | null;
  files: readonly SemanticFile[];
  semantic: ProjectContextSemantic;
  inference: ArchitecturalModule["inference"];
  confidence: ArchitecturalModule["confidence"];
  evidence: readonly ArchitectureModuleEvidence[];
  frameworkSignals: readonly ArchitectureFrameworkSignal[];
}): ArchitecturalModule {
  return {
    id: input.id,
    kind: input.kind,
    name: input.name,
    rootPath: input.rootPath,
    packageId: input.packageId,
    parentModuleId: input.parentModuleId,
    fileIds: input.files.map((file) => file.id).sort(),
    layers: layersForFiles(input.files, input.rootPath),
    sourceExports: exportsForFiles(input.files, input.semantic.exports),
    frameworkSignals: [...input.frameworkSignals].sort((left, right) =>
      left.fileId.localeCompare(right.fileId)
    ),
    inference: input.inference,
    confidence: input.confidence,
    evidence: [...input.evidence].sort(compareEvidence)
  };
}

function layersForFiles(
  files: readonly SemanticFile[],
  moduleRoot: string
): ArchitecturalModule["layers"] {
  const fileIdsByLayer = new Map<ArchitectureLayerKind, string[]>();
  for (const file of files) {
    const relative = pathRelativeToRoot(file.path, moduleRoot === "." ? "" : moduleRoot);
    const segments = relative.split("/").filter(Boolean);
    const conventional = segments.find((segment) =>
      ["domain", "application", "infrastructure", "presentation"].includes(segment)
    );
    const kind = conventional
      ? (conventional.toUpperCase() as ArchitectureLayerKind)
      : "UNCLASSIFIED";
    fileIdsByLayer.set(kind, [...(fileIdsByLayer.get(kind) ?? []), file.id]);
  }
  return LAYER_ORDER.flatMap((kind) => {
    const fileIds = fileIdsByLayer.get(kind);
    return fileIds ? [{ kind, fileIds: fileIds.sort() }] : [];
  });
}

function exportsForFiles(
  files: readonly SemanticFile[],
  exports: readonly SemanticExport[]
): ArchitecturalModule["sourceExports"] {
  const fileIds = new Set(files.map((file) => file.id));
  return exports
    .filter((sourceExport) => fileIds.has(sourceExport.fileId))
    .map((sourceExport) => ({ exportId: sourceExport.id, fileId: sourceExport.fileId }))
    .sort(
      (left, right) =>
        left.fileId.localeCompare(right.fileId) || left.exportId.localeCompare(right.exportId)
    );
}

function nestJsModuleSignals(
  files: readonly SemanticFile[],
  semantic: ProjectContextSemantic
): ArchitectureFrameworkSignal[] {
  const symbolsByFile = groupByFileId(semantic.symbols);
  const importsByFile = groupByFileId(semantic.imports);

  return files.flatMap((file) => {
    if (!/\.module\.[cm]?[jt]sx?$/.test(file.path)) return [];
    const classSymbols = (symbolsByFile.get(file.id) ?? []).filter(
      (symbol) => symbol.kind === "CLASS"
    );
    const moduleImports = (importsByFile.get(file.id) ?? []).filter(
      (sourceImport) =>
        sourceImport.moduleSpecifier === "@nestjs/common" &&
        sourceImport.namedImports.some((namedImport) => namedImport.name === "Module")
    );
    if (classSymbols.length === 0 && moduleImports.length === 0) return [];
    const strong = classSymbols.length > 0 && moduleImports.length > 0;
    return [
      {
        kind: "NESTJS_MODULE_CANDIDATE" as const,
        fileId: file.id,
        symbolIds: classSymbols.map((symbol) => symbol.id).sort(),
        importIds: moduleImports.map((sourceImport) => sourceImport.id).sort(),
        inference: strong ? ("STRONGLY_INFERRED" as const) : ("INFERRED" as const),
        confidence: strong ? ("HIGH" as const) : ("MEDIUM" as const)
      }
    ];
  });
}

function groupByFileId<T extends SemanticSymbol | SemanticImport>(
  values: readonly T[]
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const value of values)
    grouped.set(value.fileId, [...(grouped.get(value.fileId) ?? []), value]);
  return grouped;
}

function moduleId(kind: ArchitectureModuleKind, rootPath: string, packageId: string): string {
  return `architecture-module:${encodeURIComponent(JSON.stringify([kind, rootPath, packageId]))}`;
}

function packageRoot(manifestPath: string): string {
  const segments = manifestPath.split("/").filter(Boolean);
  return segments.slice(0, -1).join("/");
}

function displayRoot(rootPath: string): string {
  return rootPath || ".";
}

function rootName(rootPath: string): string {
  return rootPath === "." ? "workspace" : (rootPath.split("/").at(-1) ?? rootPath);
}

function pathBelongsToRoot(path: string, rootPath: string): boolean {
  return rootPath === "" || path === rootPath || path.startsWith(`${rootPath}/`);
}

function pathRelativeToRoot(path: string, rootPath: string): string {
  return rootPath === "" ? path : path.slice(rootPath.length).replace(/^\//, "");
}

function joinPath(rootPath: string, relativePath: string): string {
  return rootPath ? `${rootPath}/${relativePath}` : relativePath;
}

function compareModules(left: ArchitecturalModule, right: ArchitecturalModule): number {
  return (
    left.rootPath.localeCompare(right.rootPath) ||
    left.kind.localeCompare(right.kind) ||
    left.packageId.localeCompare(right.packageId) ||
    left.id.localeCompare(right.id)
  );
}

function compareEvidence(
  left: ArchitectureModuleEvidence,
  right: ArchitectureModuleEvidence
): number {
  return JSON.stringify(left).localeCompare(JSON.stringify(right));
}
