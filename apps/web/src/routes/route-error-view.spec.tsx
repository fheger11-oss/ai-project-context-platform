import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotFoundView, RouteErrorView } from "@/routes/route-error-view";

const routeState = vi.hoisted(() => ({ error: null as unknown }));

vi.mock("react-router-dom", () => ({
  isRouteErrorResponse: (error: unknown) =>
    typeof error === "object" && error !== null && "status" in error,
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
  useRouteError: () => routeState.error
}));

describe("route error views", () => {
  beforeEach(() => {
    routeState.error = null;
  });

  it("renders a friendly frontend 404 with recovery actions", () => {
    const markup = renderToStaticMarkup(<NotFoundView />);

    expect(markup).toContain("Page not found");
    expect(markup).toContain("Go to Dashboard");
    expect(markup).toContain("Go Back");
    expect(markup).not.toContain("Unexpected Application Error");
    expect(markup).not.toContain("Hey developer");
  });

  it("renders a generic error without disclosing the route error", () => {
    routeState.error = new Error("Prisma failed with secret-token at /internal/path.ts");

    const markup = renderToStaticMarkup(<RouteErrorView />);

    expect(markup).toContain("Something went wrong");
    expect(markup).toContain("Try again");
    expect(markup).toContain("Go to Dashboard");
    expect(markup).not.toContain("secret-token");
    expect(markup).not.toContain("internal/path.ts");
    expect(markup).not.toContain("Prisma");
  });

  it("uses the friendly not-found view for a router 404 response", () => {
    routeState.error = { status: 404, statusText: "Not Found", data: "internal detail" };

    const markup = renderToStaticMarkup(<RouteErrorView />);

    expect(markup).toContain("Page not found");
    expect(markup).not.toContain("internal detail");
  });
});
