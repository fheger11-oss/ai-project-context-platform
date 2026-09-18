import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { FeedbackRepository } from "../domain/contracts/feedback-repository.contract.js";
import { FEEDBACK_MESSAGE_MAX_LENGTH } from "../domain/feedback.js";
import { CreateFeedbackService } from "./create-feedback.service.js";

function createService() {
  const repository = {
    create: vi.fn(async (input) => ({
      id: "feedback_1",
      createdAt: new Date("2026-09-18T12:00:00.000Z"),
      ...input
    }))
  } as unknown as FeedbackRepository;

  return {
    repository,
    service: new CreateFeedbackService(repository)
  };
}

describe("CreateFeedbackService", () => {
  it("persists feedback for the authenticated user", async () => {
    const { repository, service } = createService();

    await expect(
      service.execute({
        userId: "user_1",
        type: "FEATURE_REQUEST",
        message: "Please add saved comparison views.",
        page: "/analyses/analysis_1"
      })
    ).resolves.toMatchObject({
      userId: "user_1",
      type: "FEATURE_REQUEST",
      message: "Please add saved comparison views.",
      page: "/analyses/analysis_1"
    });
    expect(repository.create).toHaveBeenCalledWith({
      userId: "user_1",
      type: "FEATURE_REQUEST",
      message: "Please add saved comparison views.",
      page: "/analyses/analysis_1"
    });
  });

  it("trims the message and normalizes blank pages", async () => {
    const { repository, service } = createService();

    await service.execute({
      userId: "user_1",
      type: "GENERAL",
      message: "  This workflow helped me today.  ",
      page: " "
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "This workflow helped me today.",
        page: null
      })
    );
  });

  it("rejects empty or short messages", async () => {
    const { repository, service } = createService();

    await expect(
      service.execute({
        userId: "user_1",
        type: "BUG",
        message: " ",
        page: "/"
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.execute({
        userId: "user_1",
        type: "BUG",
        message: "too short",
        page: "/"
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("rejects messages over the maximum length", async () => {
    const { repository, service } = createService();

    await expect(
      service.execute({
        userId: "user_1",
        type: "BUG",
        message: "a".repeat(FEEDBACK_MESSAGE_MAX_LENGTH + 1),
        page: "/"
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("rejects pages with query strings or hashes", async () => {
    const { repository, service } = createService();

    await expect(
      service.execute({
        userId: "user_1",
        type: "CONFUSING",
        message: "The analysis page was hard to understand.",
        page: "/analyses/analysis_1?token=secret"
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.execute({
        userId: "user_1",
        type: "CONFUSING",
        message: "The analysis page was hard to understand.",
        page: "/analyses/analysis_1#source"
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });
});
