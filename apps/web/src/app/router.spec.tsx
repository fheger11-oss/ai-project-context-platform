import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { AppShell } from "@/layouts/app-shell";
import { DashboardView } from "@/routes/dashboard-view";
import { LandingView } from "@/routes/landing-view";

const createBrowserRouter = vi.hoisted(() => vi.fn((routes: unknown[]) => ({ routes })));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = (await importOriginal()) as object;

  return {
    ...actual,
    createBrowserRouter
  };
});

describe("router", () => {
  it("keeps the existing AppShell and mounts Dashboard at the index route", async () => {
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
    const indexRoute = rootRoute?.children?.find((route) => route.index);

    expect(rootRoute?.element.type).toBe(AppShell);
    expect(indexRoute?.element.type).toBe(DashboardView);
    expect(createBrowserRouter).toHaveBeenCalledTimes(1);
  });

  it("keeps repository workspaces on /repositories/:id without adding /projects/:id", async () => {
    const { router } = await import("@/app/router");
    const routes = (
      router as {
        routes: {
          path?: string;
          children?: { path?: string }[];
        }[];
      }
    ).routes;
    const rootRoute = routes.find((route) => route.path === "/");
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
    const appRoute = routes.find((route) => route.path === "/");

    expect(landingRoute?.element.type).toBe(LandingView);
    expect(appRoute?.element.type).toBe(AppShell);
    expect(appRoute?.children?.some((route) => route.path === "landing")).toBe(false);
  });
});
