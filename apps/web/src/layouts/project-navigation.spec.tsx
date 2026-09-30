import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { RepositorySummary } from "@ai-context/contracts";

import type { ShellContext } from "@/layouts/shell-context";
import { Breadcrumbs } from "@/layouts/topbar";
import { activeProjectSection } from "./project-navigation-state";
import { ProjectNavigation } from "./project-navigation";

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
  githubUpdatedAt: "2026-09-01T00:00:00.000Z",
  lastSyncedAt: "2026-09-01T00:00:00.000Z"
};

const shellContext: ShellContext = {
  analysisId: null,
  breadcrumbs: [
    { href: "/repositories", label: "Projects" },
    { href: "/repositories/repository_1", label: "project" },
    { label: "Updates" }
  ],
  currentRepository: repository,
  isProjectLoading: false,
  projectHref: "/repositories/repository_1",
  repositoryId: "repository_1",
  section: "Updates"
};

vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    if (queryKey[0] === "dashboard") {
      return {
        data: {
          projects: [
            {
              repository: { id: "repository_1" },
              latestAnalysis: { analysisId: "analysis_24" },
              latestContext: null
            }
          ]
        },
        isLoading: false
      };
    }

    if (queryKey[2] === "state") {
      return {
        data: {
          repositoryId: "repository_1",
          freshnessStatus: "FRESH",
          currentContextCommitSha: "abcdef1234567890",
          currentProjectContextId: "context_1",
          lastAnalyzedCommitSha: "abcdef1234567890",
          lastScannedCommitSha: "abcdef1234567890",
          lastUpdateStatus: "COMPLETED",
          remoteHeadCheckedAt: "2026-09-29T10:00:00.000Z",
          remoteHeadCommitSha: "abcdef1234567890"
        },
        isLoading: false
      };
    }

    return { data: { update: null }, isLoading: false };
  }
}));

vi.mock("@/features/auth/stores/auth-session-store", () => ({
  useAuthSessionStore: (selector: (state: { accessToken: string }) => string) =>
    selector({ accessToken: "access_token" })
}));

describe("ProjectNavigation", () => {
  it("renders every project section with repository-correct destinations", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/repositories/repository_1#updates"]}>
        <ProjectNavigation shellContext={shellContext} />
      </MemoryRouter>
    );

    expect(markup).toContain("owner");
    expect(markup).toContain('href="/repositories/repository_1#overview"');
    expect(markup).toContain('href="/repositories/repository_1/timeline"');
    expect(markup).toContain('href="/analyses/analysis_24#project-context"');
    expect(markup).toContain('href="/repositories/repository_1#updates"');
    expect(markup).toContain('href="/analyses/analysis_24#documents"');
    expect(markup).toContain('href="/repositories/repository_1/decisions"');
    expect(markup).toMatch(/aria-disabled="true"[^>]*>Settings/);
    expect(markup).toMatch(/aria-current="page"[^>]*>Updates/);
  });

  it("derives nested active sections from the direct URL", () => {
    expect(activeProjectSection("/repositories/repository_1/timeline", "")).toBe("timeline");
    expect(activeProjectSection("/repositories/repository_1/decisions", "")).toBe("decisions");
    expect(activeProjectSection("/repositories/repository_1", "")).toBe("overview");
    expect(activeProjectSection("/repositories/repository_1", "#updates")).toBe("updates");
    expect(activeProjectSection("/analyses/analysis_24", "#documents")).toBe("documents");
    expect(activeProjectSection("/analyses/analysis_24", "#project-context")).toBe("context");
  });

  it("marks Timeline active only on its dedicated repository route", () => {
    const timelineMarkup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/repositories/repository_1/timeline"]}>
        <ProjectNavigation shellContext={{ ...shellContext, section: "Timeline" }} />
      </MemoryRouter>
    );
    const decisionsMarkup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/repositories/repository_1/decisions"]}>
        <ProjectNavigation shellContext={{ ...shellContext, section: "Decisions" }} />
      </MemoryRouter>
    );

    expect(timelineMarkup).toMatch(/aria-current="page"[^>]*>Timeline/);
    expect(timelineMarkup).not.toMatch(/aria-current="page"[^>]*>Overview/);
    expect(timelineMarkup).not.toMatch(/aria-current="page"[^>]*>Decisions/);
    expect(decisionsMarkup).not.toMatch(/aria-current="page"[^>]*>Timeline/);
  });

  it("marks Decisions active only on the dedicated repository route", () => {
    const decisionsMarkup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/repositories/repository_1/decisions"]}>
        <ProjectNavigation shellContext={{ ...shellContext, section: "Decisions" }} />
      </MemoryRouter>
    );
    const overviewMarkup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/repositories/repository_1"]}>
        <ProjectNavigation shellContext={{ ...shellContext, section: "Overview" }} />
      </MemoryRouter>
    );

    expect(decisionsMarkup).toMatch(/aria-current="page"[^>]*>Decisions/);
    expect(decisionsMarkup).not.toMatch(/aria-current="page"[^>]*>Overview/);
    expect(overviewMarkup).toMatch(/aria-current="page"[^>]*>Overview/);
    expect(overviewMarkup).not.toMatch(/aria-current="page"[^>]*>Decisions/);
  });
});

describe("Breadcrumbs", () => {
  it("renders navigable project parents and the current deep section", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <Breadcrumbs shellContext={shellContext} />
      </MemoryRouter>
    );

    expect(markup).toContain('aria-label="Breadcrumb"');
    expect(markup).toContain('href="/repositories"');
    expect(markup).toContain('href="/repositories/repository_1"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain("Updates");
  });
});
