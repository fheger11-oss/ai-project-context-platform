import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/button";
import { AnalysisApiRequestError, startAnalysis } from "@/features/analysis/api/analysis-api";
import { StartAnalysisButton } from "./start-analysis-button";

type MutationOptions = {
  mutationFn: () => Promise<unknown>;
  onSuccess?: (result: { analysisId: string }) => void;
};

type MutationState = {
  error?: unknown;
  isError?: boolean;
  isPending?: boolean;
};

type ButtonElementProps = {
  children?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
};

let mutationOptions: MutationOptions | null = null;
let mutationState: MutationState = {};
const mutate = vi.fn();
const navigate = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useMutation: (options: MutationOptions) => {
    mutationOptions = options;

    return {
      error: mutationState.error,
      isError: mutationState.isError ?? false,
      isPending: mutationState.isPending ?? false,
      mutate
    };
  }
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate
}));

vi.mock("@/features/analysis/api/analysis-api", async (importOriginal) => {
  const actual = (await importOriginal()) as object;

  return {
    ...actual,
    startAnalysis: vi.fn()
  };
});

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
    const found = findButtonElement(child);

    if (found) {
      return found;
    }
  }

  return null;
}

describe("StartAnalysisButton", () => {
  beforeEach(() => {
    mutationOptions = null;
    mutationState = {};
    mutate.mockReset();
    navigate.mockReset();
    vi.mocked(startAnalysis).mockReset();
  });

  it("starts analysis for the supplied scan ID", async () => {
    vi.mocked(startAnalysis).mockResolvedValue({ analysisId: "analysis_1" } as never);
    renderToStaticMarkup(<StartAnalysisButton accessToken="access_token" scanId="scan_1" />);

    await mutationOptions?.mutationFn();

    expect(startAnalysis).toHaveBeenCalledWith("access_token", "scan_1");
  });

  it("prevents duplicate submissions while analysis is running", () => {
    mutationState = { isPending: true };
    const element = StartAnalysisButton({
      accessToken: "access_token",
      scanId: "scan_1"
    }) as ReactElement;
    const button = findButtonElement(element);
    const markup = renderToStaticMarkup(element);

    expect(button?.props.disabled).toBe(true);
    expect(markup).toContain("Analyzing");
    expect(markup).toContain("Analysis is running.");
  });

  it("navigates to the returned analysis result after success", () => {
    renderToStaticMarkup(<StartAnalysisButton accessToken="access_token" scanId="scan_1" />);

    mutationOptions?.onSuccess?.({ analysisId: "analysis/with space" });

    expect(navigate).toHaveBeenCalledWith("/analyses/analysis%2Fwith%20space");
  });

  it.each([
    [401, "Sign in again to start analysis."],
    [403, "You do not have access to analyze this scan."],
    [404, "This scan is no longer available."],
    [400, "This scan is not ready for analysis."]
  ])("renders safe status-specific API errors for %s", (status, message) => {
    mutationState = {
      error: new AnalysisApiRequestError("Backend detail", status),
      isError: true
    };

    const markup = renderToStaticMarkup(
      <StartAnalysisButton accessToken="access_token" scanId="scan_1" />
    );

    expect(markup).toContain(message);
    expect(markup).not.toContain("Backend detail");
  });
});
