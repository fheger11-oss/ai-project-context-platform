import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { PrivacyView } from "./privacy-view";

describe("PrivacyView", () => {
  it("renders factual MVP privacy behavior without legal compliance claims", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <PrivacyView />
      </MemoryRouter>
    );

    expect(markup).toContain("Privacy Policy");
    expect(markup).toContain("Last updated: September 3, 2026");
    expect(markup).toContain("repo");
    expect(markup).toContain("Source-Code Processing And Storage");
    expect(markup).toContain("Maximum 5,000 files per scan");
    expect(markup).toContain(
      "Full secret scanning and content-level redaction are not currently implemented"
    );
    expect(markup).toContain(
      "does not currently send repository content to an external AI provider"
    );
    expect(markup).toContain("Self-service account deletion is not currently implemented");
    expect(markup).toContain("requires legal review");
    expect(markup).not.toContain("GDPR compliant");
    expect(markup).not.toContain("SOC 2");
    expect(markup).not.toContain("privacy@ctxaro.com");
  });
});
