import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { AppShell } from "@/layouts/app-shell";
import { AuthCallbackView } from "@/routes/auth-callback-view";
import { LandingView } from "@/routes/landing-view";
import { PrivacyView } from "@/routes/privacy-view";
import { RepositoryArchitectureHistoryView } from "@/routes/repositories/repository-architecture-history-view";
import { RepositoryArchitectureIntelligenceView } from "@/routes/repositories/repository-architecture-intelligence-view";
import { RepositoryDecisionsView } from "@/routes/repositories/repository-decisions-view";
import { RepositoryKnowledgeView } from "@/routes/repositories/repository-knowledge-view";
import { RepositoryTimelineView } from "@/routes/repositories/repository-timeline-view";
import { RootEntryView } from "@/routes/root-entry-view";

const createBrowserRouter = vi.hoisted(() => vi.fn((routes: unknown[]) => ({ routes })));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = (await importOriginal()) as object;

  return {
    ...actual,
    createBrowserRouter
  };
});

describe("router", () => {
  it("mounts the public root through an auth-aware entry view", async () => {
    const { router } = await import("@/app/router");
    const routes = (
      router as {
        routes: {
          path?: string;
          children?: { element: ReactElement; index?: boolean }[];
          element: ReactElement;
        }[];
      }
    ).routes;
    const rootRoute = routes.find((route) => route.path === "/");

    expect(rootRoute?.element.type).toBe(RootEntryView);
    expect(createBrowserRouter).toHaveBeenCalledTimes(1);
  });

  it("keeps repository workspaces on /repositories/:id without adding /projects/:id", async () => {
    const { router } = await import("@/app/router");
    const routes = (
      router as {
        routes: {
          path?: string;
          element: ReactElement;
          children?: { path?: string }[];
        }[];
      }
    ).routes;
    const rootRoute = routes.find((route) => route.path === "/" && route.element.type === AppShell);
    const paths = rootRoute?.children?.map((route) => route.path).filter(Boolean) ?? [];

    expect(paths).toContain("repositories/:id");
    expect(paths).not.toContain("projects/:id");
  });

  it("registers the repository Decisions workspace at the exact audited path", async () => {
    const { router } = await import("@/app/router");
    const routes = (
      router as {
        routes: {
          path?: string;
          element: ReactElement;
          children?: { path?: string; element: ReactElement }[];
        }[];
      }
    ).routes;
    const appRoute = routes.find((route) => route.path === "/" && route.element.type === AppShell);
    const decisionsRoute = appRoute?.children?.find(
      (route) => route.path === "repositories/:id/decisions"
    );

    expect(decisionsRoute?.element.type).toBe(RepositoryDecisionsView);
  });

  it("registers Project Knowledge at the exact repository path", async () => {
    const { router } = await import("@/app/router");
    const routes = (
      router as {
        routes: {
          path?: string;
          element: { type: unknown };
          children?: { path: string; element: { type: unknown } }[];
        }[];
      }
    ).routes;
    const appRoute = routes.find((route) => route.path === "/" && route.element.type === AppShell);
    const knowledgeRoute = appRoute?.children?.find(
      (route) => route.path === "repositories/:id/knowledge"
    );
    expect(knowledgeRoute?.element.type).toBe(RepositoryKnowledgeView);
  });

  it("registers the repository Timeline workspace at the exact path", async () => {
    const { router } = await import("@/app/router");
    const routes = (
      router as {
        routes: {
          path?: string;
          element: ReactElement;
          children?: { path?: string; element: ReactElement }[];
        }[];
      }
    ).routes;
    const appRoute = routes.find((route) => route.path === "/" && route.element.type === AppShell);
    const timelineRoute = appRoute?.children?.find(
      (route) => route.path === "repositories/:id/timeline"
    );

    expect(timelineRoute?.element.type).toBe(RepositoryTimelineView);
  });

  it("registers Architecture History at the exact repository path", async () => {
    const { router } = await import("@/app/router");
    const routes = (
      router as {
        routes: {
          path?: string;
          element: ReactElement;
          children?: { path?: string; element: ReactElement }[];
        }[];
      }
    ).routes;
    const appRoute = routes.find((route) => route.path === "/" && route.element.type === AppShell);
    const historyRoute = appRoute?.children?.find(
      (route) => route.path === "repositories/:id/architecture-history"
    );

    expect(historyRoute?.element.type).toBe(RepositoryArchitectureHistoryView);
  });

  it("registers Architecture Intelligence at the exact repository path", async () => {
    const { router } = await import("@/app/router");
    const routes = (
      router as {
        routes: {
          path?: string;
          element: ReactElement;
          children?: { path?: string; element: ReactElement }[];
        }[];
      }
    ).routes;
    const appRoute = routes.find((route) => route.path === "/" && route.element.type === AppShell);
    const intelligenceRoute = appRoute?.children?.find(
      (route) => route.path === "repositories/:id/architecture-intelligence"
    );
    expect(intelligenceRoute?.element.type).toBe(RepositoryArchitectureIntelligenceView);
  });

  it("adds the public landing page outside the authenticated application shell", async () => {
    const { router } = await import("@/app/router");
    const routes = (
      router as {
        routes: {
          path?: string;
          element: ReactElement;
          children?: { path?: string }[];
        }[];
      }
    ).routes;
    const landingRoute = routes.find((route) => route.path === "/landing");
    const appRoute = routes.find((route) => route.path === "/" && route.element.type === AppShell);

    expect(landingRoute?.element.type).toBe(LandingView);
    expect(appRoute?.element.type).toBe(AppShell);
    expect(appRoute?.children?.some((route) => route.path === "landing")).toBe(false);
  });

  it("adds the public privacy page outside the authenticated application shell", async () => {
    const { router } = await import("@/app/router");
    const routes = (
      router as {
        routes: {
          path?: string;
          element: ReactElement;
          children?: { path?: string }[];
        }[];
      }
    ).routes;
    const privacyRoute = routes.find((route) => route.path === "/privacy");
    const appRoute = routes.find((route) => route.path === "/" && route.element.type === AppShell);

    expect(privacyRoute?.element.type).toBe(PrivacyView);
    expect(appRoute?.children?.some((route) => route.path === "privacy")).toBe(false);
  });

  it("adds the OAuth callback outside the authenticated application shell", async () => {
    const { router } = await import("@/app/router");
    const routes = (
      router as {
        routes: {
          path?: string;
          element: ReactElement;
          children?: { path?: string }[];
        }[];
      }
    ).routes;
    const callbackRoute = routes.find((route) => route.path === "/auth/callback");
    const appRoute = routes.find((route) => route.path === "/" && route.element.type === AppShell);

    expect(callbackRoute?.element.type).toBe(AuthCallbackView);
    expect(appRoute?.children?.some((route) => route.path === "auth/callback")).toBe(false);
  });
});
