import type { FeedbackType } from "./feedback-type.js";

export const FEEDBACK_MESSAGE_MIN_LENGTH = 10;
export const FEEDBACK_MESSAGE_MAX_LENGTH = 2000;
export const FEEDBACK_PAGE_MAX_LENGTH = 512;

export type Feedback = {
  id: string;
  userId: string;
  type: FeedbackType;
  message: string;
  page: string | null;
  createdAt: Date;
};

export type CreateFeedbackInput = {
  userId: string;
  type: FeedbackType;
  message: string;
  page?: string | null;
};

export function normalizeFeedbackMessage(message: string): string {
  return message.trim();
}

export function normalizeFeedbackPage(page?: string | null): string | null {
  if (!page) {
    return null;
  }

  const trimmed = page.trim();

  return trimmed === "" ? null : trimmed;
}
