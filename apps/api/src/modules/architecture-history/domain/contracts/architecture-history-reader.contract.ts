export const ARCHITECTURE_HISTORY_READER = Symbol("ARCHITECTURE_HISTORY_READER");

export type ArchitectureHistorySnapshotSource = {
  historyId: string;
  repositoryId: string;
  promotedAt: Date;
  projectContextId: string;
  analysisId: string;
  scanId: string;
  commitSha: string;
  generatedAt: Date;
  contextVersion: string;
  analyzerVersion: string;
  snapshot: unknown;
};

export interface ArchitectureHistoryReader {
  list(repositoryId: string): Promise<ArchitectureHistorySnapshotSource[]>;
}
