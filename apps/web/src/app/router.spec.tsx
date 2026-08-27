import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { AppShell } from "@/layouts/app-shell";
import { DashboardView } from "@/routes/dashboard-view";

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
          children?: { element: ReactElement; index?: boolean }[];
          element: ReactElement;
        }[];
      }
    ).routes;
    const rootRoute = routes[0];
    const indexRoute = rootRoute?.children?.find((route) => route.index);

    expect(rootRoute?.element.type).toBe(AppShell);
    expect(indexRoute?.element.type).toBe(DashboardView);
    expect(createBrowserRouter).toHaveBeenCalledTimes(1);
  });
});
