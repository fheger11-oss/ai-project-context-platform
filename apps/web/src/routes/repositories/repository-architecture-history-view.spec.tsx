import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RepositoryArchitectureHistoryView } from "@/routes/repositories/repository-architecture-history-view";

let accessToken = "access_token";

vi.mock("@/features/auth/stores/auth-session-store", () => ({
  useAuthSessionStore: (selector: (state: { accessToken: string }) => string) =>
    selector({ accessToken })
}));

vi.mock("@/features/architecture-history/components/architecture-history-panel", () => ({
  ArchitectureHistoryPanel: ({
    accessToken: token,
    repositoryId
  }: {
    accessToken: string;
    repositoryId: string;
  }) => (
    <div data-access-token={token} data-repository-id={repositoryId}>
      History panel
    </div>
  )
}));

vi.mock("@/lib/analytics", () => ({ analytics: { track: vi.fn() } }));

function render(path: string, routePath = "/repositories/:id/architecture-history") {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={routePath} element={<RepositoryArchitectureHistoryView />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("RepositoryArchitectureHistoryView", () => {
  beforeEach(() => {
    accessToken = "access_token";
  });

  it("passes route and session scope to the panel", () => {
    const markup = render("/repositories/repository_1/architecture-history");

    expect(markup).toContain("History panel");
    expect(markup).toContain('data-repository-id="repository_1"');
    expect(markup).toContain('data-access-token="access_token"');
  });

  it("renders the established session-required state", () => {
    accessToken = "";
    expect(render("/repositories/repository_1/architecture-history")).toContain("Session required");
  });

  it("rejects an empty repository parameter", () => {
    expect(
      render("/repositories/architecture-history", "/repositories/:id?/architecture-history")
    ).toContain("Repository not found");
  });
});
