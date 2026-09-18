import { ApiProperty } from "@nestjs/swagger";

import type { Feedback } from "../../domain/feedback.js";
import { feedbackTypes, type FeedbackType } from "../../domain/feedback-type.js";

export type FeedbackResponse = {
  id: string;
  type: FeedbackType;
  page: string | null;
  createdAt: string;
};

export class FeedbackResponseDto implements FeedbackResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: feedbackTypes })
  type!: FeedbackType;

  @ApiProperty({ nullable: true })
  page!: string | null;

  @ApiProperty()
  createdAt!: string;
}

export function toFeedbackResponse(feedback: Feedback): FeedbackResponse {
  return {
    id: feedback.id,
    type: feedback.type,
    page: feedback.page,
    createdAt: feedback.createdAt.toISOString()
  };
}
