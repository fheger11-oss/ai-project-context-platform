export type RepositoryVisibility = "PUBLIC" | "PRIVATE" | "INTERNAL";

export type RepositorySummary = {
  id: string;
  githubId: string;
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  defaultBranch: string;
  visibility: RepositoryVisibility;
  language: string | null;
  stars: number;
  forks: number;
  isArchived: boolean;
  cloneUrl: string;
  htmlUrl: string;
  githubUpdatedAt: string;
  lastSyncedAt: string;
};

export type AvailableGitHubRepository = Omit<RepositorySummary, "id" | "lastSyncedAt"> & {
  connectedRepositoryId: string | null;
  isConnected: boolean;
};

export type ListRepositoriesResponse = {
  repositories: RepositorySummary[];
};

export type ListAvailableGitHubRepositoriesResponse = {
  repositories: AvailableGitHubRepository[];
};

export type GitHubIdentity = {
  avatarUrl: string | null;
  displayName: string | null;
  username: string;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  github: GitHubIdentity | null;
  role: "USER" | "ADMIN";
  tenantId: string | null;
  createdAt: string;
};
