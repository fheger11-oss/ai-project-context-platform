import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RepositoryDecisionsView } from "@/routes/repositories/repository-decisions-view";

let accessToken = "access_token";

vi.mock("@/features/auth/stores/auth-session-store", () => ({
  useAuthSessionStore: (selector: (state: { accessToken: string }) => string) =>
    selector({ accessToken })
}));

vi.mock("@/features/project-decisions/components/project-decision-panel", () => ({
  ProjectDecisionPanel: ({ repositoryId }: { repositoryId: string }) => (
    <div data-repository-id={repositoryId}>Decision panel</div>
  )
}));

vi.mock("@/lib/analytics", () => ({ analytics: { track: vi.fn() } }));

function render(path: string, routePath = "/repositories/:id/decisions") {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={routePath} element={<RepositoryDecisionsView />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("RepositoryDecisionsView", () => {
  beforeEach(() => {
    accessToken = "access_token";
  });

  it("passes the route repository ID to the decision panel", () => {
    const markup = render("/repositories/repository_1/decisions");

    expect(markup).toContain("Decision panel");
    expect(markup).toContain('data-repository-id="repository_1"');
  });

  it("renders the existing session-required state when signed out", () => {
    accessToken = "";

    const markup = render("/repositories/repository_1/decisions");

    expect(markup).toContain("Session required");
    expect(markup).toContain("Sign in with GitHub");
  });

  it("rejects an empty repository parameter", () => {
    const markup = render("/repositories/decisions", "/repositories/:id?/decisions");

    expect(markup).toContain("Repository not found");
  });
});
