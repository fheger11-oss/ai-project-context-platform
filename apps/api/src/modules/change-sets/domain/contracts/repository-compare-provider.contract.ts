import type { ChangedFile, ComparisonStatus } from "../change-set.js";

export const REPOSITORY_COMPARE_PROVIDER = Symbol("REPOSITORY_COMPARE_PROVIDER");

export type RepositoryCompareAccess = {
  owner: string;
  name: string;
  authorization: unknown;
};

export type RepositoryComparison = {
  baseCommitSha: string;
  targetCommitSha: string;
  comparisonStatus: ComparisonStatus;
  aheadBy: number;
  behindBy: number;
  changedFileCount: number;
  files: ChangedFile[];
};

export interface RepositoryCompareProvider {
  compare(
    repository: RepositoryCompareAccess,
    baseCommitSha: string,
    targetCommitSha: string
  ): Promise<RepositoryComparison>;
}
