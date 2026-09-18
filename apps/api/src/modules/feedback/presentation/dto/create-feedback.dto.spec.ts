import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { FEEDBACK_MESSAGE_MAX_LENGTH } from "../../domain/feedback.js";
import { CreateFeedbackDto } from "./create-feedback.dto.js";

async function validateDto(input: Record<string, unknown>) {
  return validate(plainToInstance(CreateFeedbackDto, input));
}

describe("CreateFeedbackDto", () => {
  it("accepts a valid feedback request", async () => {
    await expect(
      validateDto({
        type: "FEATURE_REQUEST",
        message: "Please add a way to compare two analyses.",
        page: "/analyses/analysis_1"
      })
    ).resolves.toHaveLength(0);
  });

  it("rejects invalid feedback types", async () => {
    const errors = await validateDto({
      type: "FEATURE",
      message: "Please add a way to compare two analyses.",
      page: "/"
    });

    expect(errors.map((error) => error.property)).toContain("type");
  });

  it("rejects empty messages", async () => {
    const errors = await validateDto({
      type: "GENERAL",
      message: "",
      page: "/"
    });

    expect(errors.map((error) => error.property)).toContain("message");
  });

  it("rejects messages over the maximum length", async () => {
    const errors = await validateDto({
      type: "BUG",
      message: "a".repeat(FEEDBACK_MESSAGE_MAX_LENGTH + 1),
      page: "/"
    });

    expect(errors.map((error) => error.property)).toContain("message");
  });

  it("rejects query strings and hashes in page", async () => {
    await expect(
      validateDto({
        type: "CONFUSING",
        message: "This page was confusing to navigate.",
        page: "/analyses/analysis_1?repo=secret"
      })
    ).resolves.toEqual([expect.objectContaining({ property: "page" })]);
    await expect(
      validateDto({
        type: "CONFUSING",
        message: "This page was confusing to navigate.",
        page: "/analyses/analysis_1#details"
      })
    ).resolves.toEqual([expect.objectContaining({ property: "page" })]);
  });
});
