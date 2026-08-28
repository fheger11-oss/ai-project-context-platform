import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { RootEntryView } from "@/routes/root-entry-view";

const authMock = vi.hoisted(() => {
  const state = {
    accessToken: "",
    hydrated: true
  };
  const useAuthSessionStore = Object.assign(
    vi.fn((selector: (store: { accessToken: string }) => string) =>
      selector({ accessToken: state.accessToken })
    ),
    {
      persist: {
        hasHydrated: vi.fn(() => state.hydrated),
        onFinishHydration: vi.fn()
      }
    }
  );

  return { state, useAuthSessionStore };
});

vi.mock("@/features/auth/stores/auth-session-store", () => ({
  useAuthSessionStore: authMock.useAuthSessionStore
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
    authMock.state.accessToken = "";
    authMock.state.hydrated = true;

    const markup = renderToStaticMarkup(<RootEntryView />);

    expect(markup).toContain("public ctxaro landing");
    expect(markup).not.toContain("authenticated ctxaro dashboard");
  });

  it("renders the dashboard inside the app shell for authenticated users", () => {
    authMock.state.accessToken = "access_token";
    authMock.state.hydrated = true;

    const markup = renderToStaticMarkup(<RootEntryView />);

    expect(markup).toContain('data-testid="app-shell"');
    expect(markup).toContain("authenticated ctxaro dashboard");
    expect(markup).not.toContain("public ctxaro landing");
  });

  it("renders a branded loading state while persisted auth is hydrating", () => {
    authMock.state.accessToken = "";
    authMock.state.hydrated = false;

    const markup = renderToStaticMarkup(<RootEntryView />);

    expect(markup).toContain("Opening ctxaro");
    expect(markup).not.toContain("public ctxaro landing");
    expect(markup).not.toContain("authenticated ctxaro dashboard");
  });
});
