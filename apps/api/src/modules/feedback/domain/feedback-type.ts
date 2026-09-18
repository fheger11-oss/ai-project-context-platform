export const feedbackTypes = ["FEATURE_REQUEST", "BUG", "CONFUSING", "GENERAL"] as const;

export type FeedbackType = (typeof feedbackTypes)[number];

export function isFeedbackType(value: unknown): value is FeedbackType {
  return typeof value === "string" && feedbackTypes.includes(value as FeedbackType);
}
