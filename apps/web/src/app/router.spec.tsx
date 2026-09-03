import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { AppShell } from "@/layouts/app-shell";
import { LandingView } from "@/routes/landing-view";
import { PrivacyView } from "@/routes/privacy-view";
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
});
