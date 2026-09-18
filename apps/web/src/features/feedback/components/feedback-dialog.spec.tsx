import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { submitFeedback } from "@/features/feedback/api/feedback-api";
import { FeedbackDialog } from "@/features/feedback/components/feedback-dialog";
import {
  FEEDBACK_MESSAGE_MAX_LENGTH,
  getFeedbackValidationMessage
} from "@/features/feedback/components/feedback-validation";

type MutationOptions = {
  mutationFn: () => Promise<unknown>;
  onError?: (error: unknown) => void;
  onSuccess?: () => void;
};

let mutationOptions: MutationOptions[] = [];
let mutationState: { isPending?: boolean } = {};

vi.mock("@tanstack/react-query", () => ({
  useMutation: (options: MutationOptions) => {
    mutationOptions.push(options);

    return {
      isPending: mutationState.isPending ?? false,
      mutate: vi.fn()
    };
  }
}));

vi.mock("@/features/feedback/api/feedback-api", async (importOriginal) => {
  const actual = (await importOriginal()) as object;

  return {
    ...actual,
    submitFeedback: vi.fn()
  };
});

vi.mock("@/lib/analytics", () => ({
  analytics: {
    track: vi.fn()
  }
}));

import { analytics } from "@/lib/analytics";

describe("FeedbackDialog", () => {
  beforeEach(() => {
    mutationOptions = [];
    mutationState = {};
    vi.mocked(submitFeedback).mockReset();
    vi.mocked(analytics.track).mockReset();
  });

  it("renders the feedback form when open", () => {
    const markup = renderToStaticMarkup(
      <FeedbackDialog
        accessToken="access_token"
        open
        page="/analyses/analysis_1"
        onClose={vi.fn()}
      />
    );

    expect(markup).toContain("Help us improve Ctxaro");
    expect(markup).toContain("Tell us what you would improve, add, or change.");
    expect(markup).toContain("Feature request");
    expect(markup).toContain("Bug");
    expect(markup).toContain("Something was confusing");
    expect(markup).toContain("General feedback");
    expect(markup).toContain("What would make Ctxaro more useful to you?");
    expect(markup).toContain("Send feedback");
    expect(markup).toContain("Cancel");
  });

  it("does not render the dialog when closed", () => {
    const markup = renderToStaticMarkup(
      <FeedbackDialog accessToken="access_token" open={false} page="/" onClose={vi.fn()} />
    );

    expect(markup).toBe("");
  });

  it("validates required, minimum, and maximum message length", () => {
    expect(getFeedbackValidationMessage("")).toBe("Message is required.");
    expect(getFeedbackValidationMessage("too short")).toBe(
      "Message must be at least 10 characters."
    );
    expect(getFeedbackValidationMessage("a".repeat(FEEDBACK_MESSAGE_MAX_LENGTH + 1))).toBe(
      "Message must be 2000 characters or fewer."
    );
    expect(getFeedbackValidationMessage("This is useful feedback.")).toBeNull();
  });

  it("shows submit loading state and prevents duplicate submissions while pending", () => {
    mutationState = { isPending: true };

    const markup = renderToStaticMarkup(
      <FeedbackDialog accessToken="access_token" open page="/repositories" onClose={vi.fn()} />
    );

    expect(markup).toContain("Sending");
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain("disabled");
  });

  it("builds a feedback submission with the selected type and SPA pathname", async () => {
    vi.mocked(submitFeedback).mockResolvedValue({
      id: "feedback_1",
      type: "FEATURE_REQUEST",
      page: "/analyses/analysis_1",
      createdAt: "2026-09-18T12:00:00.000Z"
    });
    renderToStaticMarkup(
      <FeedbackDialog
        accessToken="access_token"
        open
        page="/analyses/analysis_1"
        onClose={vi.fn()}
      />
    );

    await expect(mutationOptions[0]?.mutationFn()).resolves.toMatchObject({
      id: "feedback_1"
    });
    expect(submitFeedback).toHaveBeenCalledWith("access_token", {
      type: "FEATURE_REQUEST",
      message: "",
      page: "/analyses/analysis_1"
    });
  });

  it("tracks feedback_submitted only after a successful backend submission without the message", () => {
    renderToStaticMarkup(
      <FeedbackDialog
        accessToken="access_token"
        open
        page="/analyses/analysis_1"
        onClose={vi.fn()}
      />
    );

    expect(analytics.track).not.toHaveBeenCalled();
    mutationOptions[0]?.onSuccess?.();

    expect(analytics.track).toHaveBeenCalledWith("feedback_submitted", {
      type: "FEATURE_REQUEST",
      page: "/analyses/analysis_1"
    });
    expect(analytics.track).not.toHaveBeenCalledWith(
      "feedback_submitted",
      expect.objectContaining({
        message: expect.any(String)
      })
    );
  });

  it("shows a useful error message when submission fails", () => {
    renderToStaticMarkup(
      <FeedbackDialog accessToken="access_token" open page="/" onClose={vi.fn()} />
    );

    mutationOptions[0]?.onError?.(new Error("Network failed"));

    expect(mutationOptions).toHaveLength(1);
  });
});
