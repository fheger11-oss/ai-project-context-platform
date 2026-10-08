export type ArchitectureFindingSubject =
  | { kind: "MODULE"; moduleId: string }
  | { kind: "RELATIONSHIP"; sourceModuleId: string; targetModuleId: string }
  | { kind: "CYCLE"; moduleIds: readonly string[] };

export type ArchitectureSourceLocation = {
  start: number;
  end: number;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
};

export type ArchitectureFindingEvidence =
  | {
      kind: "CANONICAL_ARCHITECTURE_DEPENDENCIES";
      dependencyIds: readonly string[];
      relationshipIds: readonly string[];
    }
  | { kind: "MODULE"; moduleId: string; confidence: "HIGH" | "MEDIUM" | "LOW" }
  | {
      kind: "MODULE_RELATIONSHIP";
      sourceModuleId: string;
      targetModuleId: string;
      relationshipCount: number;
      confidence: "HIGH" | "MEDIUM" | "LOW";
    }
  | {
      kind: "ANALYSIS_RELATIONSHIP";
      sourceModuleId: string;
      targetModuleId: string;
      sourcePath: string;
      targetPath: string;
      relationshipKind: "IMPORTS" | "RE_EXPORTS";
      specifier: string;
      location?: ArchitectureSourceLocation;
    };
