export const REPOSITORY_CONTENT_PROVIDER = Symbol("REPOSITORY_CONTENT_PROVIDER");

export type RepositoryAccess = {
  provider: "github";
  owner: string;
  name: string;
  reference?: string;
  accessToken: string;
};

export type RepositoryContentCommit = {
  commitSha: string;
};

export type RepositoryContentFile = {
  path: string;
  extension: string | null;
  size: bigint;
  sha: string;
  isBinary: boolean;
  isHidden: boolean;
};

export interface RepositoryContentProvider {
  resolveCommit(access: RepositoryAccess): Promise<RepositoryContentCommit>;
  listSnapshotFiles(
    access: RepositoryAccess,
    commitSha: string
  ): AsyncIterable<RepositoryContentFile>;
}
