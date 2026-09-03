import type { RepositoryContentAccess } from "./repository-content-provider.contract.js";

export const REPOSITORY_ACCESS_RESOLVER = Symbol("REPOSITORY_ACCESS_RESOLVER");

export type ResolveRepositoryAccessInput = {
  repositoryId: string;
  reference?: string;
  userId: string;
};

export interface RepositoryAccessResolver {
  resolveRepositoryAccess(input: ResolveRepositoryAccessInput): Promise<RepositoryContentAccess>;
}
