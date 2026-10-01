import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectKnowledgeListResponse } from "@ai-context/contracts";
import { ProjectKnowledgePanel, projectKnowledgeListQueryKey } from "./project-knowledge-panel";

let state: { data?: ProjectKnowledgeListResponse; isLoading: boolean; isError: boolean };
const queryOptions: { queryKey: readonly unknown[]; enabled?: boolean }[] = [];
vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: { queryKey: readonly unknown[]; enabled?: boolean }) => {
    queryOptions.push(options);
    return { ...state, isFetching: false, refetch: vi.fn() };
  },
  useMutation: () => ({ error: null, isPending: false, mutate: vi.fn() }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() })
}));
function render(repositoryId = "r1") {
  return renderToStaticMarkup(
    <ProjectKnowledgePanel accessToken="token" repositoryId={repositoryId} />
  );
}
describe("ProjectKnowledgePanel", () => {
  beforeEach(() => {
    queryOptions.length = 0;
    state = {
      data: { items: [], pagination: { page: 1, pageSize: 10, total: 0, hasNextPage: false } },
      isLoading: false,
      isError: false
    };
  });
  it("uses repository-scoped Active list state and renders empty state", () => {
    const markup = render();
    expect(queryOptions[0]?.queryKey).toEqual(projectKnowledgeListQueryKey("r1", "ACTIVE", 1));
    expect(markup).toContain("No project knowledge");
  });
  it("isolates keys between repositories", () => {
    render("A");
    render("B");
    expect(queryOptions.map((item) => item.queryKey[1])).toEqual(["A", "B"]);
  });
  it("renders loading and error states", () => {
    state = { isLoading: true, isError: false };
    expect(render()).toContain("Loading knowledge");
    state = { isLoading: false, isError: true };
    expect(render()).toContain("Knowledge unavailable");
  });
});
