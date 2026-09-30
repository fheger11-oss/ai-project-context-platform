import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectDecision, ProjectDecisionListResponse } from "@ai-context/contracts";

import {
  createProjectDecision,
  listProjectDecisions,
  updateProjectDecision
} from "@/features/project-decisions/api/project-decisions-api";
import {
  ProjectDecisionPanel,
  projectDecisionConflictMessage,
  projectDecisionListQueryKey
} from "@/features/project-decisions/components/project-decision-panel";
import { ApiRequestError } from "@/lib/api-error";

type QueryOptions = {
  enabled?: boolean;
  queryFn: () => Promise<unknown>;
  queryKey: readonly unknown[];
};

type MutationOptions = {
  mutationFn: (variables: never) => Promise<unknown>;
  onError?: (error: unknown, variables: { decisionId: string }) => Promise<void> | void;
  onSuccess?: (data: ProjectDecision) => Promise<void> | void;
};

type QueryState = {
  data?: ProjectDecisionListResponse;
  error?: unknown;
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
};

let queryOptions: QueryOptions[] = [];
let mutationOptions: MutationOptions[] = [];
let listState: QueryState;
let mutationStates: {
  error?: unknown;
  isError?: boolean;
  isPending?: boolean;
  variables?: unknown;
}[];

const queryClient = {
  invalidateQueries: vi.fn().mockResolvedValue(undefined),
  refetchQueries: vi.fn().mockResolvedValue(undefined),
  setQueryData: vi.fn()
};

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: QueryOptions) => {
    queryOptions.push(options);
    if (options.queryKey[3] === "detail") {
      return {
        data: undefined,
        error: null,
        isError: false,
        isFetching: false,
        isLoading: false,
        refetch: vi.fn()
      };
    }
    return { ...listState, refetch: vi.fn() };
  },
  useMutation: (options: MutationOptions) => {
    const index = mutationOptions.length;
    mutationOptions.push(options);
    return {
      error: mutationStates[index]?.error ?? null,
      isError: mutationStates[index]?.isError ?? false,
      isPending: mutationStates[index]?.isPending ?? false,
      mutate: vi.fn(),
      reset: vi.fn(),
      variables: mutationStates[index]?.variables
    };
  },
  useQueryClient: () => queryClient
}));

vi.mock("@/features/project-decisions/api/project-decisions-api", async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return {
    ...actual,
    createProjectDecision: vi.fn(),
    getProjectDecision: vi.fn(),
    listProjectDecisions: vi.fn(),
    updateProjectDecision: vi.fn()
  };
});

const baseDecision: ProjectDecision = {
  id: "decision_1",
  repositoryId: "repository_1",
  title: "Database",
  decision: "Use managed Postgres.",
  rationale: "Reduce operational overhead.",
  affectedArea: "Infrastructure",
  status: "ACTIVE",
  decidedAt: "2026-09-30T10:30:00.000Z",
  sourceProjectContextId: "context_1",
  sourceRepositoryUpdateId: "update_1",
  sourceCommitSha: "1234567890abcdef1234567890abcdef12345678",
  createdAt: "2026-09-30T10:31:00.000Z",
  updatedAt: "2026-09-30T10:31:00.000Z"
};

function response(items: ProjectDecision[] = [baseDecision]): ProjectDecisionListResponse {
  return {
    items,
    pagination: { page: 1, pageSize: 10, total: items.length, hasNextPage: false }
  };
}

function render(repositoryId = "repository_1") {
  return renderToStaticMarkup(
    <ProjectDecisionPanel accessToken="access_token" repositoryId={repositoryId} />
  );
}

describe("ProjectDecisionPanel", () => {
  beforeEach(() => {
    queryOptions = [];
    mutationOptions = [];
    mutationStates = [{}, {}];
    listState = {
      data: response(),
      error: null,
      isError: false,
      isFetching: false,
      isLoading: false
    };
    queryClient.invalidateQueries.mockClear();
    queryClient.refetchQueries.mockClear();
    queryClient.setQueryData.mockClear();
    vi.mocked(createProjectDecision).mockReset();
    vi.mocked(listProjectDecisions).mockReset();
    vi.mocked(updateProjectDecision).mockReset();
  });

  it("uses Active by default with the exact repository-scoped list key", () => {
    const markup = render();

    expect(queryOptions[0]?.queryKey).toEqual([
      "repositories",
      "repository_1",
      "decisions",
      "list",
      "ACTIVE",
      1,
      10
    ]);
    expect(queryOptions[0]?.enabled).toBe(true);
    expect(markup).toContain("Decisions");
    expect(markup).toContain('aria-selected="true"');
    expect(markup).toContain("Active");
  });

  it("builds status and pagination keys without unscoped decision state", () => {
    expect(projectDecisionListQueryKey("repository_a", "SUPERSEDED", 1, 10)).toEqual([
      "repositories",
      "repository_a",
      "decisions",
      "list",
      "SUPERSEDED",
      1,
      10
    ]);
    expect(projectDecisionListQueryKey("repository_a", "ARCHIVED", 2, 10)).toEqual([
      "repositories",
      "repository_a",
      "decisions",
      "list",
      "ARCHIVED",
      2,
      10
    ]);
    expect(projectDecisionListQueryKey("repository_a", "ALL", 1, 10)[4]).toBe("ALL");
  });

  it("keeps repository caches and API requests isolated", async () => {
    render("repository_a");
    const firstQuery = queryOptions[0];
    queryOptions = [];
    render("repository_b");
    const secondQuery = queryOptions[0];

    expect(firstQuery?.queryKey[1]).toBe("repository_a");
    expect(secondQuery?.queryKey[1]).toBe("repository_b");

    await firstQuery?.queryFn();
    await secondQuery?.queryFn();
    expect(listProjectDecisions).toHaveBeenNthCalledWith(1, "access_token", "repository_a", {
      page: 1,
      pageSize: 10,
      status: "ACTIVE"
    });
    expect(listProjectDecisions).toHaveBeenNthCalledWith(2, "access_token", "repository_b", {
      page: 1,
      pageSize: 10,
      status: "ACTIVE"
    });
  });

  it("renders loading, error with retry, and status-specific empty states", () => {
    listState = { isError: false, isFetching: false, isLoading: true };
    expect(render()).toContain("Loading decisions");

    listState = {
      error: new Error("offline"),
      isError: true,
      isFetching: false,
      isLoading: false
    };
    expect(render()).toContain("Decisions unavailable");
    expect(render()).toContain("Retry");

    listState = {
      data: response([]),
      isError: false,
      isFetching: false,
      isLoading: false
    };
    expect(render()).toContain("No active decisions");
    expect(render()).toContain("Record the first decision");
  });

  it("renders decision content and read-only provenance", () => {
    const markup = render();

    expect(markup).toContain("Database");
    expect(markup).toContain("Use managed Postgres.");
    expect(markup).toContain("Reduce operational overhead.");
    expect(markup).toContain("Infrastructure");
    expect(markup).toContain("Source provenance");
    expect(markup).toContain("context_1");
    expect(markup).toContain("update_1");
    expect(markup).toContain('title="1234567890abcdef1234567890abcdef12345678"');
  });

  it("shows only lifecycle actions allowed for each status", () => {
    const active = render();
    expect(active).toContain("Archive");
    expect(active).toContain("Supersede");
    expect(active).not.toContain("Restore to Active");

    listState = { ...listState, data: response([{ ...baseDecision, status: "ARCHIVED" }]) };
    const archived = render();
    expect(archived).toContain("Restore to Active");
    expect(archived).not.toContain(">Archive<");
    expect(archived).not.toContain(">Supersede<");

    listState = { ...listState, data: response([{ ...baseDecision, status: "SUPERSEDED" }]) };
    const superseded = render();
    expect(superseded).not.toContain("Restore to Active");
    expect(superseded).not.toContain(">Archive<");
    expect(superseded).not.toContain(">Supersede<");
  });

  it("renders backend pagination metadata and controls", () => {
    listState = {
      ...listState,
      data: {
        items: [baseDecision],
        pagination: { page: 2, pageSize: 10, total: 25, hasNextPage: true }
      }
    };

    const markup = render();
    expect(markup).toContain("Page 2 · 25 total");
    expect(markup).toContain("Previous");
    expect(markup).toContain("Next");
  });

  it("invalidates only the repository decision root after successful create and update", async () => {
    render();

    await mutationOptions[0]?.onSuccess?.(baseDecision);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["repositories", "repository_1", "decisions"]
    });

    queryClient.invalidateQueries.mockClear();
    await mutationOptions[1]?.onSuccess?.({ ...baseDecision, title: "Updated" });
    expect(queryClient.setQueryData).toHaveBeenCalledWith(
      ["repositories", "repository_1", "decisions", "detail", "decision_1"],
      expect.objectContaining({ title: "Updated" })
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["repositories", "repository_1", "decisions"]
    });
  });

  it("handles 409 without retrying or applying an optimistic status", async () => {
    render();
    const conflict = new ApiRequestError("Conflict", 409, { message: "Conflict" });

    await mutationOptions[1]?.onError?.(conflict, { decisionId: "decision_1" });

    expect(projectDecisionConflictMessage.message).toBe(
      "This decision changed while your update was being applied. The latest state has been reloaded. Review it before trying again."
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["repositories", "repository_1", "decisions"]
    });
    expect(queryClient.refetchQueries).toHaveBeenCalledWith({
      queryKey: ["repositories", "repository_1", "decisions", "detail", "decision_1"],
      exact: true
    });
    expect(queryClient.setQueryData).not.toHaveBeenCalled();
  });
});
