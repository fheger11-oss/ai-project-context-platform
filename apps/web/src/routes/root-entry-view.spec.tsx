import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { RootEntryView } from "@/routes/root-entry-view";

let accessToken = "";

vi.mock("@/features/auth/stores/auth-session-store", () => ({
  useAuthSessionStore: (selector: (state: { accessToken: string }) => string) =>
    selector({ accessToken })
}));

vi.mock("@/routes/landing-view", () => ({
  LandingView: () => <main>public ctxaro landing</main>
}));

vi.mock("@/routes/dashboard-view", () => ({
  DashboardView: () => <section>authenticated ctxaro dashboard</section>
}));

vi.mock("@/layouts/app-shell", () => ({
  AppShell: ({ children }: { children?: ReactNode }) => (
    <div data-testid="app-shell">{children}</div>
  )
}));

describe("RootEntryView", () => {
  it("renders the landing page for unauthenticated visitors", () => {
    accessToken = "";

    const markup = renderToStaticMarkup(<RootEntryView />);

    expect(markup).toContain("public ctxaro landing");
    expect(markup).not.toContain("authenticated ctxaro dashboard");
  });

  it("renders the dashboard inside the app shell for authenticated users", () => {
    accessToken = "access_token";

    const markup = renderToStaticMarkup(<RootEntryView />);

    expect(markup).toContain('data-testid="app-shell"');
    expect(markup).toContain("authenticated ctxaro dashboard");
    expect(markup).not.toContain("public ctxaro landing");
  });
});
