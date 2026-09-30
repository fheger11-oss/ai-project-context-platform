import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RepositoryTimelineView } from "@/routes/repositories/repository-timeline-view";

let accessToken = "access_token";

vi.mock("@/features/auth/stores/auth-session-store", () => ({
  useAuthSessionStore: (selector: (state: { accessToken: string }) => string) =>
    selector({ accessToken })
}));

vi.mock("@/features/project-timeline/components/project-timeline-panel", () => ({
  ProjectTimelinePanel: ({
    accessToken: token,
    repositoryId
  }: {
    accessToken: string;
    repositoryId: string;
  }) => (
    <div data-access-token={token} data-repository-id={repositoryId}>
      Timeline panel
    </div>
  )
}));

vi.mock("@/lib/analytics", () => ({ analytics: { track: vi.fn() } }));

function render(path: string, routePath = "/repositories/:id/timeline") {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={routePath} element={<RepositoryTimelineView />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("RepositoryTimelineView", () => {
  beforeEach(() => {
    accessToken = "access_token";
  });

  it("passes the session and route repository ID to the Timeline panel", () => {
    const markup = render("/repositories/repository_1/timeline");

    expect(markup).toContain("Timeline panel");
    expect(markup).toContain('data-repository-id="repository_1"');
    expect(markup).toContain('data-access-token="access_token"');
  });

  it("renders the existing session-required state when signed out", () => {
    accessToken = "";

    const markup = render("/repositories/repository_1/timeline");

    expect(markup).toContain("Session required");
    expect(markup).toContain("Sign in with GitHub");
  });

  it("rejects an empty repository parameter", () => {
    const markup = render("/repositories/timeline", "/repositories/:id?/timeline");

    expect(markup).toContain("Repository not found");
  });
});
