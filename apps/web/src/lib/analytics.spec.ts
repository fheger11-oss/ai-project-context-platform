import { beforeEach, describe, expect, it, vi } from "vitest";

const posthogMock = vi.hoisted(() => ({
  capture: vi.fn(),
  identify: vi.fn(),
  init: vi.fn(),
  reset: vi.fn()
}));

vi.mock("posthog-js", () => ({
  default: posthogMock
}));

import {
  analytics,
  initializeAnalytics,
  resetAnalyticsForTests,
  sanitizeAnalyticsProperties
} from "@/lib/analytics";

describe("analytics", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    resetAnalyticsForTests();
  });

  it("does nothing when analytics is disabled", () => {
    analytics.track("landing_viewed", { page: "/" });
    analytics.identify("user_1");
    analytics.reset();

    expect(posthogMock.capture).not.toHaveBeenCalled();
    expect(posthogMock.identify).not.toHaveBeenCalled();
    expect(posthogMock.reset).not.toHaveBeenCalled();
  });

  it("initializes PostHog when a client key is configured", () => {
    vi.stubGlobal("window", {});

    initializeAnalytics({
      MODE: "production",
      VITE_POSTHOG_HOST: "https://us.i.posthog.com",
      VITE_POSTHOG_KEY: "phc_test"
    });

    expect(posthogMock.init).toHaveBeenCalledWith(
      "phc_test",
      expect.objectContaining({
        api_host: "https://us.i.posthog.com",
        autocapture: false,
        capture_pageview: false,
        disable_session_recording: true,
        person_profiles: "identified_only"
      })
    );
  });

  it("does not throw when configured tracking calls are made", () => {
    vi.stubGlobal("window", {});
    initializeAnalytics({ MODE: "production", VITE_POSTHOG_KEY: "phc_test" });

    expect(() => {
      analytics.track("scan_completed", { files_processed: 12 });
      analytics.identify("user_1");
      analytics.reset();
    }).not.toThrow();

    expect(posthogMock.capture).toHaveBeenCalledWith("scan_completed", {
      files_processed: 12
    });
    expect(posthogMock.identify).toHaveBeenCalledWith("user_1");
    expect(posthogMock.reset).toHaveBeenCalledTimes(1);
  });

  it("filters sensitive analytics properties before sending events", () => {
    expect(
      sanitizeAnalyticsProperties({
        access_token: "ACCESS_TOKEN",
        content: "private source",
        document_type: "README",
        email: "user@example.com",
        file_path: "src/private.ts",
        files_processed: 42,
        format: "MARKDOWN",
        repository_name: "owner/private-repo",
        secret: "SECRET",
        source_code: "const secret = true",
        url: "https://github.com/owner/private-repo"
      })
    ).toEqual({
      document_type: "README",
      files_processed: 42,
      format: "MARKDOWN"
    });
  });
});
