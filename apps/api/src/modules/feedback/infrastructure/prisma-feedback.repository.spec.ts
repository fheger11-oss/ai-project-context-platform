import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../prisma/prisma.service.js";
import { PrismaFeedbackRepository } from "./prisma-feedback.repository.js";

describe("PrismaFeedbackRepository", () => {
  it("persists feedback without accepting a client-provided user id override", async () => {
    const createdAt = new Date("2026-09-18T12:00:00.000Z");
    const create = vi.fn(async ({ data }) => ({
      id: "feedback_1",
      createdAt,
      ...data
    }));
    const prisma = {
      feedback: {
        create
      }
    } as unknown as PrismaService;
    const repository = new PrismaFeedbackRepository(prisma);

    await expect(
      repository.create({
        userId: "user_1",
        type: "BUG",
        message: "The sync button failed after reconnecting.",
        page: "/repositories/repository_1"
      })
    ).resolves.toEqual({
      id: "feedback_1",
      userId: "user_1",
      type: "BUG",
      message: "The sync button failed after reconnecting.",
      page: "/repositories/repository_1",
      createdAt
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        userId: "user_1",
        type: "BUG",
        message: "The sync button failed after reconnecting.",
        page: "/repositories/repository_1"
      }
    });
  });
});
