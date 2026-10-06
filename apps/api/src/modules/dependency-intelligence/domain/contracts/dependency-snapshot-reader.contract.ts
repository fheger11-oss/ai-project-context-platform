import type { DependencySnapshot } from "../dependency-snapshot.js";

export const DEPENDENCY_SNAPSHOT_READER = Symbol("DEPENDENCY_SNAPSHOT_READER");

export interface DependencySnapshotReader {
  readCurrent(repositoryId: string): Promise<DependencySnapshot | null>;
  readPromoted(repositoryId: string, projectContextId: string): Promise<DependencySnapshot>;
}
