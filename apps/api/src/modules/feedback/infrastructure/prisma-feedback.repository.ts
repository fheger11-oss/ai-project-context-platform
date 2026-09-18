import { Inject, Injectable } from "@nestjs/common";

import type { FeedbackModel } from "../../../generated/prisma/models.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { FeedbackRepository } from "../domain/contracts/feedback-repository.contract.js";
import type { CreateFeedbackInput, Feedback } from "../domain/feedback.js";

@Injectable()
export class PrismaFeedbackRepository implements FeedbackRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(input: CreateFeedbackInput): Promise<Feedback> {
    const stored = await this.prisma.feedback.create({
      data: {
        userId: input.userId,
        type: input.type,
        message: input.message,
        page: input.page ?? null
      }
    });

    return toFeedback(stored);
  }
}

function toFeedback(stored: FeedbackModel): Feedback {
  return {
    id: stored.id,
    userId: stored.userId,
    type: stored.type,
    message: stored.message,
    page: stored.page,
    createdAt: stored.createdAt
  };
}
