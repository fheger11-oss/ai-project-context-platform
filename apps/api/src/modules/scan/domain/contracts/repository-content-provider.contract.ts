export const REPOSITORY_CONTENT_PROVIDER = Symbol("REPOSITORY_CONTENT_PROVIDER");

export type RepositoryContentAccess = {
  locator: string;
  reference?: string;
  authorization: unknown;
};

export type RepositoryContentCommit = {
  commitSha: string;
};

export type RepositoryContentFile = {
  path: string;
  extension: string | null;
  size: bigint;
  sha: string;
  content: string | null;
  isBinary: boolean;
  isHidden: boolean;
};

export interface RepositoryContentProvider {
  resolveCommit(access: RepositoryContentAccess): Promise<RepositoryContentCommit>;
  listSnapshotFiles(
    access: RepositoryContentAccess,
    commitSha: string
  ): AsyncIterable<RepositoryContentFile>;
}
