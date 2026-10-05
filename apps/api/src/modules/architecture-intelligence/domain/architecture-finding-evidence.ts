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
  | { kind: "MODULE"; moduleId: string }
  | { kind: "MODULE_RELATIONSHIP"; sourceModuleId: string; targetModuleId: string }
  | {
      kind: "ANALYSIS_RELATIONSHIP";
      sourcePath: string;
      targetPath: string;
      relationshipKind: "IMPORTS" | "RE_EXPORTS";
      specifier: string;
      location: ArchitectureSourceLocation;
    };
