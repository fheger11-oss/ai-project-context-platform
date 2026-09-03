import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AvailableGitHubRepository } from "@/features/repositories/api/repositories-api";
import {
  connectRepository,
  disconnectRepository,
  listAvailableGitHubRepositories
} from "@/features/repositories/api/repositories-api";
import { ConnectRepositoryView } from "./connect-repository-view";

type MutationOptions = {
  mutationFn: (repository: AvailableGitHubRepository) => Promise<unknown>;
  onSuccess?: () => Promise<void>;
};

type QueryOptions = {
  enabled?: boolean;
  queryFn: () => Promise<unknown>;
  queryKey: readonly unknown[];
};

const invalidateQueries = vi.fn(async () => undefined);
const refetch = vi.fn(async () => undefined);
const mutationOptions: MutationOptions[] = [];

const repository: AvailableGitHubRepository = {
  githubId: "github_1",
  name: "project",
  fullName: "owner/project",
  owner: "owner",
  description: "Repository description",
  defaultBranch: "main",
  visibility: "PRIVATE",
  language: "TypeScript",
  stars: 5,
  forks: 2,
  isArchived: false,
  cloneUrl: "https://github.com/owner/project.git",
  htmlUrl: "https://github.com/owner/project",
  githubUpdatedAt: "2026-08-26T09:00:00.000Z",
  connectedRepositoryId: "repository_1",
  isConnected: true
};

vi.mock("@tanstack/react-query", () => ({
  useMutation: (options: MutationOptions) => {
    mutationOptions.push(options);

    return {
      isError: false,
      isPending: false,
      isSuccess: false,
      mutate: vi.fn(),
      variables: undefined
    };
  },
  useQuery: (_options: QueryOptions) => ({
    data: { repositories: [repository] },
    isError: false,
    isFetching: false,
    isSuccess: true,
    refetch
  }),
  useQueryClient: () => ({
    invalidateQueries
  })
}));

vi.mock("@/features/auth/stores/auth-session-store", () => ({
  useAuthSessionStore: (selector: (state: { accessToken: string }) => string) =>
    selector({ accessToken: "access_token" })
}));

vi.mock("@/features/repositories/api/repositories-api", async (importOriginal) => {
  const actual = (await importOriginal()) as object;

  return {
    ...actual,
    connectRepository: vi.fn(),
    disconnectRepository: vi.fn(),
    listAvailableGitHubRepositories: vi.fn()
  };
});

describe("ConnectRepositoryView", () => {
  beforeEach(() => {
    mutationOptions.length = 0;
    invalidateQueries.mockClear();
    refetch.mockClear();
    vi.mocked(connectRepository).mockReset();
    vi.mocked(disconnectRepository).mockReset();
    vi.mocked(listAvailableGitHubRepositories).mockReset();
  });

  it("renders available GitHub repositories", () => {
    const markup = renderToStaticMarkup(<ConnectRepositoryView />);

    expect(markup).toContain("owner/project");
    expect(markup).toContain("Disconnect");
  });

  it("discloses repository source storage before connection actions", () => {
    const markup = renderToStaticMarkup(<ConnectRepositoryView />);

    expect(markup).toContain("Repository data notice");
    expect(markup).toContain("store relevant non-binary source content");
    expect(markup).toContain("disconnecting it removes repository-derived");
  });

  it("refreshes dashboard and repository state after connect succeeds", async () => {
    renderToStaticMarkup(<ConnectRepositoryView />);

    await mutationOptions[0]?.onSuccess?.();

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["dashboard", "projects"]
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["repositories"]
    });
    expect(refetch).toHaveBeenCalled();
  });

  it("refreshes dashboard and repository state after disconnect succeeds", async () => {
    renderToStaticMarkup(<ConnectRepositoryView />);

    await mutationOptions[1]?.onSuccess?.();

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["dashboard", "projects"]
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["repositories"]
    });
    expect(refetch).toHaveBeenCalled();
  });
});
