import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AuthCallbackView } from "@/routes/auth-callback-view";

describe("AuthCallbackView", () => {
  it("renders ctxaro branding while finishing GitHub connection", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AuthCallbackView />
      </MemoryRouter>
    );

    expect(markup).toContain("ctxaro");
    expect(markup).toContain("Finishing GitHub connection");
  });
});
