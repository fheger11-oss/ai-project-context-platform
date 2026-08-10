export const REPOSITORY_OWNERSHIP_VERIFIER = Symbol("REPOSITORY_OWNERSHIP_VERIFIER");

export type VerifyRepositoryOwnershipInput = {
  userId: string;
  repositoryId: string;
};

export interface RepositoryOwnershipVerifier {
  verifyRepositoryOwnership(input: VerifyRepositoryOwnershipInput): Promise<void>;
}
