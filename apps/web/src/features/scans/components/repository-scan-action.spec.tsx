import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/button";
import type { ScanSnapshot } from "@/features/scans/api/scan-api";
import { ScanApiRequestError, startScan } from "@/features/scans/api/scan-api";
import { RepositoryScanAction } from "./repository-scan-action";

type MutationState = {
  data?: ScanSnapshot;
  error?: unknown;
  isError?: boolean;
  isPending?: boolean;
};

type MutationOptions = {
  mutationFn: () => Promise<unknown>;
  onSettled?: () => Promise<void>;
};

type ButtonElementProps = {
  "aria-busy"?: boolean;
  "aria-describedby"?: string;
  children?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
};

const mutationOptions: MutationOptions[] = [];
let mutationStates: MutationState[] = [];
const invalidateQueries = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries
  }),
  useMutation: (options: MutationOptions) => {
    mutationOptions.push(options);
    const state = mutationStates.shift() ?? {};

    return {
      data: state.data,
      error: state.error,
      isError: state.isError ?? false,
      isPending: state.isPending ?? false,
      mutate: () => {
        void options.mutationFn();
      }
    };
  }
}));

vi.mock("@/features/scans/api/scan-api", async (importOriginal) => {
  const actual = (await importOriginal()) as object;

  return {
    ...actual,
    startScan: vi.fn()
  };
});

const completedScan: ScanSnapshot = {
  id: "scan_1",
  repositoryId: "repository_1",
  status: "COMPLETED",
  commitSha: "fffed9f5ecab4ebb9a861f357e134b8e16bb4d92",
  startedAt: "2026-08-10T10:00:00.000Z",
  completedAt: "2026-08-10T10:00:06.000Z",
  durationMs: 6864,
  totalFiles: 91,
  totalSize: "563302",
  createdAt: "2026-08-10T10:00:00.000Z",
  updatedAt: "2026-08-10T10:00:06.000Z"
};

function renderAction(
  state?: MutationState,
  repositoryId = "repository_1",
  accessToken = "access_token"
) {
  mutationStates = state ? [state] : [];

  return RepositoryScanAction({ accessToken, repositoryId }) as ReactElement;
}

function staticMarkup(element: ReactElement) {
  return renderToStaticMarkup(element);
}

function findButtonElement(node: ReactNode): ReactElement<ButtonElementProps> | null {
  if (!node || typeof node !== "object" || !("type" in node) || !("props" in node)) {
    return null;
  }

  const element = node as ReactElement<ButtonElementProps>;

  if (element.type === Button) {
    return element;
  }

  const children = element.props.children;
  const childList = Array.isArray(children) ? children : [children];

  for (const child of childList) {
    const match = findButtonElement(child);

    if (match) {
      return match;
    }
  }

  return null;
}

describe("RepositoryScanAction", () => {
  beforeEach(() => {
    mutationOptions.length = 0;
    mutationStates = [];
    invalidateQueries.mockReset();
    vi.mocked(startScan).mockReset();
  });

  it("renders a scan action for a repository", () => {
    const markup = staticMarkup(renderAction());

    expect(markup).toContain("Start scan");
  });

  it("clicking scan calls startScan with the existing access token and repository id", () => {
    vi.mocked(startScan).mockResolvedValue(completedScan);
    const button = findButtonElement(renderAction());

    expect(button?.props.onClick).toBeDefined();
    button?.props.onClick?.();

    expect(startScan).toHaveBeenCalledWith("access_token", "repository_1");
  });

  it("does not start a second client request while the repository scan is pending", () => {
    vi.mocked(startScan).mockResolvedValue(completedScan);
    const button = findButtonElement(renderAction({ isPending: true }));

    button?.props.onClick?.();

    expect(startScan).not.toHaveBeenCalled();
  });

  it("invalidates repository scan history and dashboard state after a scan settles", async () => {
    renderAction();

    await mutationOptions[0]?.onSettled?.();

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["dashboard", "projects"]
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["scan-history", "repository_1"]
    });
  });

  it("does not invalidate another repository history after a scan settles", async () => {
    renderAction(undefined, "repository_a");

    await mutationOptions[0]?.onSettled?.();

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["scan-history", "repository_a"]
    });
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: ["scan-history", "repository_b"]
    });
  });

  it("shows loading state and disables the scan action while pending", () => {
    const element = renderAction({ isPending: true });
    const button = findButtonElement(element);
    const markup = staticMarkup(element);

    expect(button?.props.disabled).toBe(true);
    expect(button?.props["aria-busy"]).toBe(true);
    expect(button?.props["aria-describedby"]).toBe("scan-feedback-repository_1");
    expect(markup).toContain("Scanning");
    expect(markup).toContain("Scan request is running.");
    expect(markup).toContain('role="status"');
  });

  it("displays a successful backend ScanSnapshot", () => {
    const markup = staticMarkup(renderAction({ data: completedScan }));

    expect(markup).toContain("Repository snapshot captured.");
    expect(markup).toContain("Completed");
    expect(markup).toContain("fffed9f5ecab4ebb9a861f357e134b8e16bb4d92");
    expect(markup).toContain("91");
    expect(markup).toContain("563302 bytes");
    expect(markup).toContain("6864 ms");
    expect(markup).toContain('role="status"');
  });

  it("displays backend totalSize as returned without recalculating it", () => {
    const markup = staticMarkup(
      renderAction({
        data: {
          ...completedScan,
          totalFiles: 999,
          totalSize: "12345678901234567890"
        }
      })
    );

    expect(markup).toContain("999");
    expect(markup).toContain("12345678901234567890 bytes");
  });

  it("displays a safe authentication error message for 401 responses", () => {
    const markup = staticMarkup(
      renderAction({
        error: new ScanApiRequestError("Authorization Bearer secret-token", 401),
        isError: true
      })
    );

    expect(markup).toContain("Sign in again to start a scan.");
    expect(markup).not.toContain("secret-token");
    expect(markup).not.toContain("Authorization");
    expect(markup).not.toContain("Bearer");
    expect(markup).toContain('role="alert"');
  });

  it("displays a safe repository error message for 404 responses", () => {
    const markup = staticMarkup(
      renderAction({
        error: new ScanApiRequestError("Authorization Bearer secret-token", 404),
        isError: true
      })
    );

    expect(markup).toContain("This repository is not available for scanning.");
    expect(markup).not.toContain("secret-token");
    expect(markup).not.toContain("Authorization");
    expect(markup).not.toContain("Bearer");
  });

  it("displays a safe generic error message for other API errors", () => {
    const markup = staticMarkup(
      renderAction({
        error: new ScanApiRequestError(
          "Database stack trace Authorization Bearer secret-token",
          500
        ),
        isError: true
      })
    );

    expect(markup).toContain("Scan could not be started.");
    expect(markup).not.toContain("Database stack trace");
    expect(markup).not.toContain("secret-token");
    expect(markup).not.toContain("Authorization");
    expect(markup).not.toContain("Bearer");
  });

  it("displays a safe retry-oriented message for network failures and leaves retry available", () => {
    const element = renderAction({
      error: new Error("fetch failed\n    at Authorization Bearer secret-token"),
      isError: true
    });
    const button = findButtonElement(element);
    const markup = staticMarkup(element);

    expect(button?.props.disabled).toBe(false);
    expect(markup).toContain("Network problem. Check your connection and try again.");
    expect(markup).not.toContain("fetch failed");
    expect(markup).not.toContain("secret-token");
    expect(markup).not.toContain("Authorization");
    expect(markup).not.toContain("Bearer");
  });

  it("does not call the API and shows session feedback when the access token is missing", () => {
    const element = renderAction(undefined, "repository_1", "");
    const button = findButtonElement(element);
    const markup = staticMarkup(element);

    button?.props.onClick?.();

    expect(button?.props.disabled).toBe(true);
    expect(startScan).not.toHaveBeenCalled();
    expect(markup).toContain("Sign in again to start a scan.");
  });

  it("does not render credential-shaped values from scan responses", () => {
    const markup = staticMarkup(renderAction({ data: completedScan }));

    expect(markup).not.toContain("accessToken");
    expect(markup).not.toContain("refreshToken");
    expect(markup).not.toContain("bearerToken");
    expect(markup).not.toContain("authorization");
    expect(markup).not.toContain("credential");
  });

  it("keeps scan request state scoped per repository action", () => {
    mutationStates = [{ isPending: true }, { isPending: false }];
    const firstButton = findButtonElement(
      RepositoryScanAction({ accessToken: "access_token", repositoryId: "repository_a" })
    );
    const secondButton = findButtonElement(
      RepositoryScanAction({ accessToken: "access_token", repositoryId: "repository_b" })
    );

    expect(firstButton?.props.disabled).toBe(true);
    expect(secondButton?.props.disabled).toBe(false);
  });
});
