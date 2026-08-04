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
  isConnected: boolean;
};

export type ListRepositoriesResponse = {
  repositories: RepositorySummary[];
};

export type ListAvailableGitHubRepositoriesResponse = {
  repositories: AvailableGitHubRepository[];
};
