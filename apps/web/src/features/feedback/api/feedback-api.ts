import { authenticatedFetch } from "@/lib/authenticated-fetch";

export const feedbackTypes = ["FEATURE_REQUEST", "BUG", "CONFUSING", "GENERAL"] as const;

export type FeedbackType = (typeof feedbackTypes)[number];

export type SubmitFeedbackInput = {
  type: FeedbackType;
  message: string;
  page?: string;
};

export type FeedbackResponse = {
  id: string;
  type: FeedbackType;
  page: string | null;
  createdAt: string;
};

export class FeedbackApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

export async function submitFeedback(
  accessToken: string,
  input: SubmitFeedbackInput
): Promise<FeedbackResponse> {
  const response = await authenticatedFetch("/feedback", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    throw new FeedbackApiRequestError(
      payload?.message ?? "Feedback request failed",
      response.status
    );
  }

  return response.json() as Promise<FeedbackResponse>;
}
