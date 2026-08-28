import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { HeroSection } from "@/features/landing/components/hero-section";
import { LandingNav } from "@/features/landing/components/landing-nav";

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
    const markup = renderToStaticMarkup(<HeroSection />);

    expect(markup).toContain('href="http://localhost:3000/api/v1/auth/github"');
    expect(markup).toContain("Start for free");
  });
});
