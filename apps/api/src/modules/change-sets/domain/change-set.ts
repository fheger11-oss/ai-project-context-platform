export enum ComparisonStatus {
  IDENTICAL = "IDENTICAL",
  AHEAD = "AHEAD",
  BEHIND = "BEHIND",
  DIVERGED = "DIVERGED"
}

export enum ChangeSetCompleteness {
  COMPLETE = "COMPLETE",
  INCOMPLETE = "INCOMPLETE"
}

export enum FileChangeType {
  ADDED = "ADDED",
  MODIFIED = "MODIFIED",
  DELETED = "DELETED",
  RENAMED = "RENAMED",
  COPIED = "COPIED"
}

export type ChangedFile = {
  path: string;
  type: FileChangeType;
  additions: number;
  deletions: number;
  previousPath?: string;
};

export type ChangeSet = {
  baseCommitSha: string;
  targetCommitSha: string;
  comparisonStatus: ComparisonStatus;
  completeness: ChangeSetCompleteness;
  aheadBy: number;
  behindBy: number;
  changedFileCount: number;
  additions: number;
  deletions: number;
  files: ChangedFile[];
};

export function createChangeSet(input: {
  baseCommitSha: string;
  targetCommitSha: string;
  comparisonStatus: ComparisonStatus;
  completeness: ChangeSetCompleteness;
  aheadBy?: number;
  behindBy?: number;
  files: ChangedFile[];
}): ChangeSet {
  const files = input.files.map((file) => ({ ...file }));

  return {
    baseCommitSha: input.baseCommitSha,
    targetCommitSha: input.targetCommitSha,
    comparisonStatus: input.comparisonStatus,
    completeness: input.completeness,
    aheadBy: input.aheadBy ?? 0,
    behindBy: input.behindBy ?? 0,
    changedFileCount: files.length,
    additions: files.reduce((total, file) => total + file.additions, 0),
    deletions: files.reduce((total, file) => total + file.deletions, 0),
    files
  };
}

export function createEmptyChangeSet(commitSha: string): ChangeSet {
  return createChangeSet({
    baseCommitSha: commitSha,
    targetCommitSha: commitSha,
    comparisonStatus: ComparisonStatus.IDENTICAL,
    completeness: ChangeSetCompleteness.COMPLETE,
    files: []
  });
}
