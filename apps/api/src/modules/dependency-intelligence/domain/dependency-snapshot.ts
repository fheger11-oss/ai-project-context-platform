import type { PackageDependencyType } from "../../analysis/domain/project-detection/project-profile.js";

export type DependencyDeclaration = {
  packageName: string;
  declaredVersion: string;
  dependencyType: PackageDependencyType;
  manifestPath: string;
};

export type DependencySnapshot = {
  repositoryId: string;
  projectContextId: string;
  analysisId: string;
  commitSha: string;
  analyzerVersion: string;
  contextVersion: string;
  declarations: readonly DependencyDeclaration[];
};
