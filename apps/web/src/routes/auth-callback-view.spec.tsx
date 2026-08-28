import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { readAuthCallbackSession } from "@/routes/auth-callback-session";
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

  it("reads the existing OAuth callback session payload", () => {
    expect(
      readAuthCallbackSession("#access_token=access&refresh_token=refresh&expires_in=3600")
    ).toEqual({
      accessToken: "access",
      refreshToken: "refresh",
      expiresIn: 3600
    });
  });

  it("treats missing callback tokens as an invalid callback state", () => {
    expect(readAuthCallbackSession("#access_token=access")).toBeNull();
  });
});
