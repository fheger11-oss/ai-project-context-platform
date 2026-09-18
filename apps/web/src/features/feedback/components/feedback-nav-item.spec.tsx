import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { FeedbackNavItem } from "@/features/feedback/components/feedback-nav-item";

vi.mock("@/features/auth/stores/auth-session-store", () => ({
  useAuthSessionStore: (selector: (state: { accessToken: string }) => string) =>
    selector({ accessToken: "access_token" })
}));

vi.mock("@/features/feedback/components/feedback-dialog", () => ({
  FeedbackDialog: ({ open }: { open: boolean }) => (open ? <div>feedback dialog</div> : null)
}));

describe("FeedbackNavItem", () => {
  it("renders a persistent Feedback entry for the authenticated app navigation", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/analyses/analysis_1?tab=files#section"]}>
        <FeedbackNavItem collapsed={false} />
      </MemoryRouter>
    );

    expect(markup).toContain("Feedback");
    expect(markup).not.toContain("Help us improve Ctxaro");
  });

  it("can render the collapsed icon-only navigation entry", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <FeedbackNavItem collapsed />
      </MemoryRouter>
    );

    expect(markup).toContain('aria-label="Feedback"');
    expect(markup).toContain('title="Feedback"');
  });
});
