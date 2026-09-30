import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { RepositorySummary } from "@ai-context/contracts";

import { useShellContext } from "@/layouts/shell-context";

const repository: RepositorySummary = {
  id: "repository_1",
  githubId: "github_1",
  name: "project",
  fullName: "owner/project",
  owner: "owner",
  description: null,
  defaultBranch: "main",
  visibility: "PRIVATE",
  language: "TypeScript",
  stars: 0,
  forks: 0,
  isArchived: false,
  cloneUrl: "https://github.com/owner/project.git",
  htmlUrl: "https://github.com/owner/project",
  githubUpdatedAt: "2026-09-30T10:00:00.000Z",
  lastSyncedAt: "2026-09-30T10:00:00.000Z"
};

vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    if (queryKey[0] === "repositories") {
      return { data: repository, isLoading: false };
    }
    return { data: undefined, isLoading: false };
  }
}));

vi.mock("@/features/auth/stores/auth-session-store", () => ({
  useAuthSessionStore: (selector: (state: { accessToken: string }) => string) =>
    selector({ accessToken: "access_token" })
}));

function ShellContextProbe() {
  const context = useShellContext(useLocation());

  return (
    <div
      data-repository-id={context.repositoryId ?? ""}
      data-project-href={context.projectHref ?? ""}
      data-section={context.section}
    >
      {context.breadcrumbs.map((item) => item.label).join(" > ")}
    </div>
  );
}

describe("useShellContext", () => {
  it("resolves repository context and Decisions breadcrumbs for the descendant route", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/repositories/repository_1/decisions"]}>
        <ShellContextProbe />
      </MemoryRouter>
    );

    expect(markup).toContain('data-repository-id="repository_1"');
    expect(markup).toContain('data-project-href="/repositories/repository_1"');
    expect(markup).toContain('data-section="Decisions"');
    expect(markup).toContain("Projects &gt; project &gt; Decisions");
  });

  it("resolves repository context and Timeline breadcrumbs for the descendant route", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/repositories/repository_1/timeline"]}>
        <ShellContextProbe />
      </MemoryRouter>
    );

    expect(markup).toContain('data-repository-id="repository_1"');
    expect(markup).toContain('data-project-href="/repositories/repository_1"');
    expect(markup).toContain('data-section="Timeline"');
    expect(markup).toContain("Projects &gt; project &gt; Timeline");
  });
});
