import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { Sidebar } from "@/layouts/sidebar";
import type { ShellContext } from "@/layouts/shell-context";

vi.mock("@/features/auth/components/auth-user-section", () => ({
  AuthUserSection: () => <div>account</div>
}));

const shellContext: ShellContext = {
  analysisId: null,
  breadcrumbs: [{ label: "Dashboard" }],
  currentRepository: null,
  isProjectLoading: false,
  projectHref: null,
  repositoryId: null,
  section: "Dashboard"
};

describe("Sidebar branding", () => {
  it("renders ctxaro branding in the MVP shell navigation", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <Sidebar shellContext={shellContext} />
      </MemoryRouter>
    );

    expect(markup).toContain("ctxaro");
    expect(markup).toContain("Developer workspace");
  });
});
