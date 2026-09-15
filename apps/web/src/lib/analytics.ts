import posthog from "posthog-js";

type AnalyticsProperties = Record<string, boolean | number | string | null | undefined>;

const blockedPropertyFragments = [
  "authorization",
  "content",
  "email",
  "password",
  "secret",
  "source_code",
  "token",
  "username"
];
const blockedPropertyKeys = new Set([
  "code",
  "file",
  "file_name",
  "file_path",
  "name",
  "owner",
  "path",
  "repo",
  "repo_name",
  "repository",
  "repository_name",
  "repository_url",
  "url"
]);

let initialized = false;
let enabled = false;

export type AnalyticsEnvironment = Pick<
  ImportMetaEnv,
  "MODE" | "VITE_POSTHOG_HOST" | "VITE_POSTHOG_KEY"
>;

export function sanitizeAnalyticsProperties(
  properties: AnalyticsProperties = {}
): AnalyticsProperties {
  return Object.fromEntries(
    Object.entries(properties).filter(([key, value]) => {
      const normalizedKey = key.toLowerCase();

      if (
        blockedPropertyKeys.has(normalizedKey) ||
        blockedPropertyFragments.some((fragment) => normalizedKey.includes(fragment))
      ) {
        return false;
      }

      return ["boolean", "number", "string"].includes(typeof value) || value === null;
    })
  );
}

export function initializeAnalytics(environment: AnalyticsEnvironment): void {
  if (initialized) {
    return;
  }

  initialized = true;

  if (typeof window === "undefined" || !environment.VITE_POSTHOG_KEY) {
    return;
  }

  try {
    const config = {
      autocapture: false,
      capture_pageview: false,
      disable_session_recording: true,
      person_profiles: "identified_only" as const
    };

    posthog.init(
      environment.VITE_POSTHOG_KEY,
      environment.VITE_POSTHOG_HOST
        ? { ...config, api_host: environment.VITE_POSTHOG_HOST }
        : config
    );
    enabled = true;
  } catch {
    enabled = false;
  }
}

export const analytics = {
  identify(userId: string): void {
    if (!enabled || !userId) {
      return;
    }

    posthog.identify(userId);
  },

  reset(): void {
    if (!enabled) {
      return;
    }

    posthog.reset();
  },

  track(event: string, properties?: AnalyticsProperties): void {
    if (!enabled) {
      return;
    }

    posthog.capture(event, sanitizeAnalyticsProperties(properties));
  }
};

export function resetAnalyticsForTests(): void {
  initialized = false;
  enabled = false;
}
