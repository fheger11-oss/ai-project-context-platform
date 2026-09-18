import { BadRequestException, Inject, Injectable } from "@nestjs/common";

import {
  FEEDBACK_MESSAGE_MAX_LENGTH,
  FEEDBACK_MESSAGE_MIN_LENGTH,
  FEEDBACK_PAGE_MAX_LENGTH,
  normalizeFeedbackMessage,
  normalizeFeedbackPage,
  type Feedback
} from "../domain/feedback.js";
import {
  FEEDBACK_REPOSITORY,
  type FeedbackRepository
} from "../domain/contracts/feedback-repository.contract.js";
import type { FeedbackType } from "../domain/feedback-type.js";

type CreateFeedbackCommand = {
  userId: string;
  type: FeedbackType;
  message: string;
  page?: string | null;
};

@Injectable()
export class CreateFeedbackService {
  constructor(
    @Inject(FEEDBACK_REPOSITORY)
    private readonly feedbackRepository: FeedbackRepository
  ) {}

  async execute(command: CreateFeedbackCommand): Promise<Feedback> {
    const message = normalizeFeedbackMessage(command.message);
    const page = normalizeFeedbackPage(command.page);

    if (message.length < FEEDBACK_MESSAGE_MIN_LENGTH) {
      throw new BadRequestException(
        `Feedback message must be at least ${FEEDBACK_MESSAGE_MIN_LENGTH} characters.`
      );
    }

    if (message.length > FEEDBACK_MESSAGE_MAX_LENGTH) {
      throw new BadRequestException(
        `Feedback message must be ${FEEDBACK_MESSAGE_MAX_LENGTH} characters or fewer.`
      );
    }

    if (page && (page.length > FEEDBACK_PAGE_MAX_LENGTH || !isSafeSpaPathname(page))) {
      throw new BadRequestException("Feedback page must be a pathname without query or hash.");
    }

    return this.feedbackRepository.create({
      userId: command.userId,
      type: command.type,
      message,
      page
    });
  }
}

function isSafeSpaPathname(page: string): boolean {
  return page.startsWith("/") && !page.includes("?") && !page.includes("#");
}
