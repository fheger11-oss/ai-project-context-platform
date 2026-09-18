import type { CreateFeedbackInput, Feedback } from "../feedback.js";

export const FEEDBACK_REPOSITORY = Symbol("FEEDBACK_REPOSITORY");

export interface FeedbackRepository {
  create(input: CreateFeedbackInput): Promise<Feedback>;
}
