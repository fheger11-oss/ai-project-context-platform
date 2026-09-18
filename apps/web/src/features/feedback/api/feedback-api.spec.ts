import { afterEach, describe, expect, it, vi } from "vitest";

import { FeedbackApiRequestError, submitFeedback } from "@/features/feedback/api/feedback-api";

function mockFetch(body: unknown, init: ResponseInit = { status: 200 }) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), init));
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

describe("feedback-api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("submits feedback through the authenticated Feedback API", async () => {
    const fetchMock = mockFetch({
      id: "feedback_1",
      type: "FEATURE_REQUEST",
      page: "/analyses/analysis_1",
      createdAt: "2026-09-18T12:00:00.000Z"
    });

    await expect(
      submitFeedback("access_token", {
        type: "FEATURE_REQUEST",
        message: "Please add saved comparison views.",
        page: "/analyses/analysis_1"
      })
    ).resolves.toMatchObject({
      id: "feedback_1",
      type: "FEATURE_REQUEST",
      page: "/analyses/analysis_1"
    });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/api/v1/feedback", {
      method: "POST",
      headers: {
        Authorization: "Bearer access_token",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "FEATURE_REQUEST",
        message: "Please add saved comparison views.",
        page: "/analyses/analysis_1"
      })
    });
  });

  it("propagates Feedback API errors", async () => {
    mockFetch({ message: "Feedback message must be at least 10 characters." }, { status: 400 });
    const request = submitFeedback("access_token", {
      type: "BUG",
      message: "short",
      page: "/"
    });

    await expect(request).rejects.toBeInstanceOf(FeedbackApiRequestError);
    await expect(request).rejects.toMatchObject({
      status: 400,
      message: "Feedback message must be at least 10 characters."
    });
  });
});
