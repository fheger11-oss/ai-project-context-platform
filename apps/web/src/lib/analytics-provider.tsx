import { useEffect } from "react";
import type { ReactNode } from "react";

import { analytics, initializeAnalytics } from "@/lib/analytics";

type AnalyticsProviderProps = {
  children: ReactNode;
};

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  useEffect(() => {
    initializeAnalytics(import.meta.env);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    let lastTrackedPage: string | null = null;
    const trackPageView = () => {
      if (lastTrackedPage === window.location.pathname) {
        return;
      }

      lastTrackedPage = window.location.pathname;
      analytics.track("page_view", {
        page: window.location.pathname
      });
    };
    const dispatchLocationChange = () => window.dispatchEvent(new Event("ctxaro:locationchange"));
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function pushState(...args) {
      const result = originalPushState.apply(this, args);
      dispatchLocationChange();
      return result;
    };
    window.history.replaceState = function replaceState(...args) {
      const result = originalReplaceState.apply(this, args);
      dispatchLocationChange();
      return result;
    };

    trackPageView();
    window.addEventListener("popstate", trackPageView);
    window.addEventListener("ctxaro:locationchange", trackPageView);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", trackPageView);
      window.removeEventListener("ctxaro:locationchange", trackPageView);
    };
  }, []);

  return children;
}
