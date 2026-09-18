export const FEEDBACK_MESSAGE_MIN_LENGTH = 10;
export const FEEDBACK_MESSAGE_MAX_LENGTH = 2000;

export function getFeedbackValidationMessage(message: string): string | null {
  if (!message) {
    return "Message is required.";
  }

  if (message.length < FEEDBACK_MESSAGE_MIN_LENGTH) {
    return `Message must be at least ${FEEDBACK_MESSAGE_MIN_LENGTH} characters.`;
  }

  if (message.length > FEEDBACK_MESSAGE_MAX_LENGTH) {
    return `Message must be ${FEEDBACK_MESSAGE_MAX_LENGTH} characters or fewer.`;
  }

  return null;
}
