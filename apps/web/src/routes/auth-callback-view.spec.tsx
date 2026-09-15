import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { completeAuthCallback } from "@/routes/auth-callback-flow";
import { readAuthCallbackSession } from "@/routes/auth-callback-session";
import { AuthCallbackView } from "@/routes/auth-callback-view";

describe("AuthCallbackView", () => {
  it("renders ctxaro branding while finishing GitHub connection", () => {
    const queryClient = new QueryClient();
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AuthCallbackView />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(markup).toContain("ctxaro");
    expect(markup).toContain("Finishing GitHub connection");
  });

  it("parses OAuth tokens from a URL fragment", () => {
    expect(
      readAuthCallbackSession("#access_token=access&refresh_token=refresh&expires_in=7200")
    ).toEqual({
      accessToken: "access",
      refreshToken: "refresh",
      expiresIn: 7200
    });
  });

  it("does not accept OAuth tokens from query parameters", () => {
    expect(
      readAuthCallbackSession("?access_token=access&refresh_token=refresh&expires_in=7200")
    ).toBeNull();
  });

  it("returns null when required callback tokens are missing", () => {
    expect(readAuthCallbackSession("#access_token=access")).toBeNull();
    expect(readAuthCallbackSession("#refresh_token=refresh&expires_in=7200")).toBeNull();
    expect(readAuthCallbackSession("#access_token=access&expires_in=7200")).toBeNull();
    expect(readAuthCallbackSession("#access_token=access&refresh_token=refresh")).toBeNull();
  });

  it("returns null when callback state is malformed", () => {
    expect(
      readAuthCallbackSession("#access_token=access&refresh_token=refresh&expires_in=not-a-number")
    ).toBeNull();
  });

  it("persists a valid callback fragment, cleans the URL, refreshes auth state, and navigates home", () => {
    const setSession = vi.fn();
    const replaceCallbackUrl = vi.fn();
    const navigate = vi.fn();
    const queryClient = {
      invalidateQueries: vi.fn(),
      removeQueries: vi.fn()
    };
    const consoleMethods = [
      vi.spyOn(console, "error").mockImplementation(() => undefined),
      vi.spyOn(console, "info").mockImplementation(() => undefined),
      vi.spyOn(console, "log").mockImplementation(() => undefined),
      vi.spyOn(console, "warn").mockImplementation(() => undefined)
    ];

    const completed = completeAuthCallback({
      hash: "#access_token=TEST_ACCESS_TOKEN&refresh_token=TEST_REFRESH_TOKEN&expires_in=7200",
      navigate,
      queryClient,
      replaceCallbackUrl,
      setSession
    });

    expect(completed).toBe(true);
    expect(setSession).toHaveBeenCalledWith({
      accessToken: "TEST_ACCESS_TOKEN",
      refreshToken: "TEST_REFRESH_TOKEN",
      expiresIn: 7200
    });
    expect(replaceCallbackUrl).toHaveBeenCalledTimes(1);
    expect(queryClient.removeQueries).toHaveBeenCalledWith({ queryKey: ["auth", "me"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["auth", "me"] });
    expect(navigate).toHaveBeenCalledWith("/", { replace: true });

    const consoleOutput = consoleMethods
      .flatMap((spy) => spy.mock.calls)
      .flat()
      .join(" ");
    expect(consoleOutput).not.toContain("TEST_ACCESS_TOKEN");
    expect(consoleOutput).not.toContain("TEST_REFRESH_TOKEN");

    consoleMethods.forEach((spy) => spy.mockRestore());
  });

  it("does not persist malformed callback state", () => {
    const setSession = vi.fn();
    const replaceCallbackUrl = vi.fn();
    const navigate = vi.fn();
    const queryClient = {
      invalidateQueries: vi.fn(),
      removeQueries: vi.fn()
    };

    const completed = completeAuthCallback({
      hash: "#refresh_token=TEST_REFRESH_TOKEN&expires_in=7200",
      navigate,
      queryClient,
      replaceCallbackUrl,
      setSession
    });

    expect(completed).toBe(false);
    expect(setSession).not.toHaveBeenCalled();
    expect(replaceCallbackUrl).not.toHaveBeenCalled();
    expect(queryClient.removeQueries).not.toHaveBeenCalled();
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/", { replace: true });
  });
});
