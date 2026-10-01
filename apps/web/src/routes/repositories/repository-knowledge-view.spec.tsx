import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RepositoryKnowledgeView } from "./repository-knowledge-view";

let accessToken = "token";
vi.mock("@/features/auth/stores/auth-session-store", () => ({
  useAuthSessionStore: (selector: (state: { accessToken: string }) => string) =>
    selector({ accessToken })
}));
vi.mock("@/features/project-knowledge/components/project-knowledge-panel", () => ({
  ProjectKnowledgePanel: ({ repositoryId }: { repositoryId: string }) => (
    <div data-repository-id={repositoryId}>Knowledge panel</div>
  )
}));
function render(path: string, route = "/repositories/:id/knowledge") {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={route} element={<RepositoryKnowledgeView />} />
      </Routes>
    </MemoryRouter>
  );
}
describe("RepositoryKnowledgeView", () => {
  beforeEach(() => {
    accessToken = "token";
  });
  it("passes repository scope to the panel", () =>
    expect(render("/repositories/repository_1/knowledge")).toContain(
      'data-repository-id="repository_1"'
    ));
  it("requires a session", () => {
    accessToken = "";
    expect(render("/repositories/repository_1/knowledge")).toContain("Session required");
  });
  it("rejects a missing repository ID", () =>
    expect(render("/repositories/knowledge", "/repositories/:id?/knowledge")).toContain(
      "Repository not found"
    ));
});
