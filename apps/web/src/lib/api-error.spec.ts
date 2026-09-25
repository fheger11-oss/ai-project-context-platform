import { describe, expect, it } from "vitest";

import { ApiRequestError, apiRequestErrorFromResponse, userFacingError } from "./api-error";

describe("userFacingError", () => {
  it("maps a monthly analysis quota with its reset date", () => {
    const result = userFacingError(
      new ApiRequestError("You have reached your monthly analysis limit.", 429, {
        statusCode: 429,
        error: "Quota Exceeded",
        message: "You have reached your monthly analysis limit.",
        quota: {
          resource: "analyses",
          limit: 3,
          currentUsage: 3,
          resetAt: "2026-10-01T00:00:00.000Z"
        }
      }),
      "repositoryUpdate"
    );
    expect(result).toEqual({
      title: "Monthly analysis limit reached",
      message: "You've reached your monthly analysis limit. Your allowance will reset on October 1."
    });
  });

  it.each([
    [401, "Session expired", "Your session has expired. Please sign in again to continue."],
    [403, "Access denied", "You don't have permission to perform this action."],
    [
      429,
      "Too many requests",
      "You're doing that a little too quickly. Please wait a moment and try again."
    ]
  ] as const)("maps HTTP %s safely", (status, title, message) => {
    expect(userFacingError(new ApiRequestError("backend detail", status))).toEqual({
      title,
      message
    });
  });

  it("uses a safe specific validation message", () => {
    expect(
      userFacingError(
        new ApiRequestError("Invalid input", 400, { message: ["Repository name is required"] })
      )
    ).toEqual({ title: "Something needs your attention", message: "Repository name is required" });
  });

  it("keeps a known safe application error actionable", () => {
    expect(userFacingError(new ApiRequestError("Repository was not found", 404))).toEqual({
      title: "Request couldn't be completed",
      message: "Repository was not found"
    });
  });

  it("sanitizes unexpected server failures", () => {
    expect(
      userFacingError(
        new ApiRequestError("Prisma connection failed /srv/app", 500),
        "repositoryUpdate"
      )
    ).toEqual({
      title: "Repository update failed",
      message: "We couldn't update your repository right now. Please try again later."
    });
  });

  it.each([
    new TypeError("Failed to fetch"),
    new Error("Network failed"),
    null,
    { unexpected: true }
  ])("maps network and malformed errors without exposing details", (error) => {
    expect(userFacingError(error)).toEqual({
      title: "Connection problem",
      message: "We couldn't reach Ctxaro. Please check your connection and try again."
    });
  });
});

describe("apiRequestErrorFromResponse", () => {
  it("preserves structured backend error metadata", async () => {
    const error = await apiRequestErrorFromResponse(
      new Response(
        JSON.stringify({
          message: "Quota reached",
          error: "Quota Exceeded",
          quota: { resource: "analyses", limit: 3, currentUsage: 3, resetAt: null }
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      ),
      "Request failed"
    );
    expect(error).toMatchObject({
      status: 429,
      message: "Quota reached",
      payload: { error: "Quota Exceeded", quota: { resource: "analyses" } }
    });
  });

  it("handles malformed API error bodies", async () => {
    const error = await apiRequestErrorFromResponse(
      new Response("not-json", { status: 500 }),
      "Request failed"
    );
    expect(error).toMatchObject({ status: 500, message: "Request failed", payload: null });
  });
});
