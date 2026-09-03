import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { HeroSection } from "@/features/landing/components/hero-section";
import { LandingFooter } from "@/features/landing/components/landing-footer";
import { LandingNav } from "@/features/landing/components/landing-nav";

let accessToken = "";

vi.mock("@/features/auth/stores/auth-session-store", () => ({
  useAuthSessionStore: (selector: (state: { accessToken: string }) => string) =>
    selector({ accessToken })
}));

describe("landing branding and CTAs", () => {
  it("renders the ctxaro wordmark in the landing navigation", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <LandingNav />
      </MemoryRouter>
    );

    expect(markup).toContain("ctxaro");
    expect(markup).toContain('href="/"');
  });

  it("uses the existing GitHub auth URL for the hero primary CTA", () => {
    accessToken = "";

    const markup = renderToStaticMarkup(<HeroSection />);

    expect(markup).toContain('href="http://localhost:3000/api/v1/auth/github"');
    expect(markup).toContain("Start for free");
  });

  it("sends unauthenticated dashboard exploration to GitHub auth", () => {
    accessToken = "";

    const markup = renderToStaticMarkup(<HeroSection />);

    expect(markup).toContain("Open dashboard");
    expect(markup).toContain('href="http://localhost:3000/api/v1/auth/github"');
  });

  it("keeps dashboard exploration on root for authenticated users", () => {
    accessToken = "access_token";

    const markup = renderToStaticMarkup(<HeroSection />);

    expect(markup).toContain("Open dashboard");
    expect(markup).toContain('href="/"');
  });

  it("links to the public privacy page from the landing footer", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <LandingFooter />
      </MemoryRouter>
    );

    expect(markup).toContain("Privacy");
    expect(markup).toContain('href="/privacy"');
  });
});
