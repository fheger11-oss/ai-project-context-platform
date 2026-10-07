export type ArchitectureModuleKind =
  "WORKSPACE_PACKAGE" | "BACKEND_FEATURE" | "FRONTEND_FEATURE" | "SHARED_AREA";

export type ArchitectureModuleInference = "OBSERVED" | "STRONGLY_INFERRED" | "INFERRED";

export type ArchitectureModuleConfidence = "HIGH" | "MEDIUM" | "LOW";

export type ArchitectureLayerKind =
  "DOMAIN" | "APPLICATION" | "INFRASTRUCTURE" | "PRESENTATION" | "UNCLASSIFIED";

export type ArchitectureModuleLayer = {
  kind: ArchitectureLayerKind;
  fileIds: readonly string[];
};

export type ArchitectureSourceExportReference = {
  exportId: string;
  fileId: string;
};

export type ArchitectureFrameworkSignal = {
  kind: "NESTJS_MODULE_CANDIDATE";
  fileId: string;
  symbolIds: readonly string[];
  importIds: readonly string[];
  inference: "STRONGLY_INFERRED" | "INFERRED";
  confidence: "HIGH" | "MEDIUM";
};

export type ArchitectureModuleEvidence =
  | {
      kind: "PACKAGE_MANIFEST";
      packageId: string;
      manifestPath: string;
    }
  | {
      kind: "DIRECTORY_CONVENTION";
      convention: "BACKEND_MODULES" | "FRONTEND_FEATURES" | "SHARED_SOURCE_AREA";
      rootPath: string;
    }
  | {
      kind: "SOURCE_FILE";
      fileId: string;
    }
  | {
      kind: "SOURCE_EXPORT";
      exportId: string;
      fileId: string;
    }
  | {
      kind: "SOURCE_SYMBOL";
      symbolId: string;
      fileId: string;
    }
  | {
      kind: "SOURCE_IMPORT";
      importId: string;
      fileId: string;
    };

export type ArchitecturalModule = {
  id: string;
  kind: ArchitectureModuleKind;
  name: string;
  rootPath: string;
  packageId: string;
  parentModuleId: string | null;
  fileIds: readonly string[];
  layers: readonly ArchitectureModuleLayer[];
  sourceExports: readonly ArchitectureSourceExportReference[];
  frameworkSignals: readonly ArchitectureFrameworkSignal[];
  inference: ArchitectureModuleInference;
  confidence: ArchitectureModuleConfidence;
  evidence: readonly ArchitectureModuleEvidence[];
};

export type ProjectContextArchitectureModel = {
  modules: readonly ArchitecturalModule[];
};

export const EMPTY_PROJECT_CONTEXT_ARCHITECTURE_MODEL: ProjectContextArchitectureModel = {
  modules: []
};
