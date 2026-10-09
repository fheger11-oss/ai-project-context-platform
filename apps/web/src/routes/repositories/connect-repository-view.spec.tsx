import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConnectRepositoryResponse } from "@ai-context/contracts";

import type { AvailableGitHubRepository } from "@/features/repositories/api/repositories-api";
import {
  connectRepository,
  disconnectRepository,
  listAvailableGitHubRepositories
} from "@/features/repositories/api/repositories-api";
import { startScan } from "@/features/scans/api/scan-api";
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
let connectionResult: ConnectRepositoryResponse | undefined;
let connectionSucceeded = false;

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

const connectedRepository: ConnectRepositoryResponse = {
  ...repository,
  id: "returned_repository_42",
  githubId: repository.githubId,
  lastSyncedAt: "2026-08-26T10:00:00.000Z",
  automaticUpdates: {
    capability: "CAN_MANAGE_WEBHOOK",
    configuration: "ENABLED",
    enabled: true,
    lastOutcome: "WEBHOOK_CREATED",
    lastVerifiedAt: "2026-08-26T10:00:00.000Z"
  }
};

vi.mock("@tanstack/react-query", () => ({
  useMutation: (options: MutationOptions) => {
    const isConnectionMutation = mutationOptions.length === 0;
    mutationOptions.push(options);

    return {
      data: isConnectionMutation ? connectionResult : undefined,
      isError: false,
      isPending: false,
      isSuccess: isConnectionMutation && connectionSucceeded,
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

vi.mock("@/features/scans/api/scan-api", () => ({
  startScan: vi.fn()
}));

function LocationProbe() {
  const location = useLocation();

  return <span data-location={location.pathname} />;
}

describe("ConnectRepositoryView", () => {
  beforeEach(() => {
    mutationOptions.length = 0;
    invalidateQueries.mockClear();
    refetch.mockClear();
    vi.mocked(connectRepository).mockReset();
    vi.mocked(disconnectRepository).mockReset();
    vi.mocked(listAvailableGitHubRepositories).mockReset();
    vi.mocked(startScan).mockReset();
    connectionResult = undefined;
    connectionSucceeded = false;
  });

  function renderView() {
    return renderToStaticMarkup(
      <MemoryRouter initialEntries={["/repositories/connect"]}>
        <ConnectRepositoryView />
        <LocationProbe />
      </MemoryRouter>
    );
  }

  it("renders available GitHub repositories", () => {
    const markup = renderView();

    expect(markup).toContain("owner/project");
    expect(markup).toContain("Disconnect");
  });

  it("keeps the full repository name visible with narrow-screen wrapping", () => {
    const markup = renderView();

    expect(markup).toContain("owner/project");
    expect(markup).toContain("w-full min-w-0 break-words text-sm font-medium");
    expect(markup).toContain("[overflow-wrap:anywhere]");
    expect(markup).not.toContain('class="truncate text-sm font-medium"');
  });

  it("discloses repository source storage before connection actions", () => {
    const markup = renderView();

    expect(markup).toContain("Repository data notice");
    expect(markup).toContain("store relevant non-binary source content");
    expect(markup).toContain("disconnecting it removes repository-derived");
  });

  it("refreshes dashboard and repository state after connect succeeds", async () => {
    renderView();

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
    renderView();

    await mutationOptions[1]?.onSuccess?.();

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["dashboard", "projects"]
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["repositories"]
    });
    expect(refetch).toHaveBeenCalled();
  });

  it("uses the connected repository response for the explicit Open project action", () => {
    connectionResult = connectedRepository;
    connectionSucceeded = true;

    const markup = renderView();

    expect(markup).toContain("Repository connected");
    expect(markup).toContain("Repository metadata is stored and ready for scanning.");
    expect(markup).toContain("Open project");
    expect(markup).toContain('href="/repositories/returned_repository_42"');
    expect(markup).toContain('data-location="/repositories/connect"');
    expect(connectRepository).not.toHaveBeenCalled();
    expect(startScan).not.toHaveBeenCalled();
  });

  it("falls back to Projects without producing an invalid repository URL", () => {
    connectionSucceeded = true;

    const markup = renderView();

    expect(markup).toContain("View projects");
    expect(markup).toContain('href="/repositories"');
    expect(markup).not.toContain("/repositories/undefined");
  });
});
