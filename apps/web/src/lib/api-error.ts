export type ApiErrorPayload = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  code?: string;
  quota?: {
    resource?: string;
    limit?: number;
    currentUsage?: number;
    resetAt?: string | null;
  };
};

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly payload: ApiErrorPayload | null = null
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export async function apiRequestErrorFromResponse(
  response: Response,
  fallbackMessage: string
): Promise<ApiRequestError> {
  const value: unknown = await response.json().catch(() => null);
  const payload = isApiErrorPayload(value) ? value : null;
  const message = normalizedMessage(payload?.message) ?? fallbackMessage;
  return new ApiRequestError(message, response.status, payload);
}

export type UserFacingError = {
  title: string;
  message: string;
};

export function userFacingError(
  error: unknown,
  context: "general" | "repositoryUpdate" = "general"
): UserFacingError {
  const normalized = normalizeApiError(error);
  if (!normalized) {
    return {
      title: context === "repositoryUpdate" ? "Repository update failed" : "Connection problem",
      message:
        context === "repositoryUpdate"
          ? "We couldn't update your repository right now. Please check your connection and try again."
          : "We couldn't reach Ctxaro. Please check your connection and try again."
    };
  }

  if (
    (normalized.status === 401 || normalized.status === 403 || normalized.status === 502) &&
    /github/i.test(normalized.message)
  ) {
    return {
      title: "GitHub access unavailable",
      message: "GitHub access is unavailable. Please reconnect your GitHub account and try again."
    };
  }
  if (normalized.status === 401) {
    return {
      title: "Session expired",
      message: "Your session has expired. Please sign in again to continue."
    };
  }
  if (normalized.status === 403) {
    return { title: "Access denied", message: "You don't have permission to perform this action." };
  }
  if (normalized.status === 429 && normalized.payload?.quota) {
    const resource = quotaResourceLabel(normalized.payload.quota.resource);
    const reset = resetDateMessage(normalized.payload.quota.resetAt);
    return {
      title: `Monthly ${resource} limit reached`,
      message: `You've reached your monthly ${resource} limit. ${reset}`
    };
  }
  if (normalized.status === 429) {
    return {
      title: "Too many requests",
      message: "You're doing that a little too quickly. Please wait a moment and try again."
    };
  }
  if (normalized.status === 400 || normalized.status === 422) {
    return {
      title: "Something needs your attention",
      message: safeValidationMessage(normalized.payload?.message)
    };
  }
  if (normalized.status >= 500) {
    return {
      title: context === "repositoryUpdate" ? "Repository update failed" : "Something went wrong",
      message:
        context === "repositoryUpdate"
          ? "We couldn't update your repository right now. Please try again later."
          : "Ctxaro couldn't complete that request right now. Please try again later."
    };
  }

  return {
    title:
      context === "repositoryUpdate"
        ? "Repository update couldn't be completed"
        : "Request couldn't be completed",
    message: normalized.message || "Please try again."
  };
}

function normalizeApiError(error: unknown): ApiRequestError | null {
  if (error instanceof ApiRequestError) return error;
  if (
    !error ||
    typeof error !== "object" ||
    !("status" in error) ||
    typeof error.status !== "number"
  )
    return null;
  const message =
    "message" in error && typeof error.message === "string" ? error.message : "Request failed";
  const payload = "payload" in error && isApiErrorPayload(error.payload) ? error.payload : null;
  return new ApiRequestError(message, error.status, payload);
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  return typeof value === "object" && value !== null;
}

function normalizedMessage(message: ApiErrorPayload["message"]): string | null {
  if (typeof message === "string" && message.trim()) return message.trim();
  if (Array.isArray(message)) {
    const safe = message.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0
    );
    return safe.length ? safe.join(" ") : null;
  }
  return null;
}

function safeValidationMessage(message: ApiErrorPayload["message"]): string {
  if (Array.isArray(message)) {
    return normalizedMessage(message) ?? "Please check the information you entered and try again.";
  }
  return "Please check the information you entered and try again.";
}

function quotaResourceLabel(resource: string | undefined): string {
  const labels: Record<string, string> = {
    analyses: "analysis",
    scans: "scan",
    contexts: "project context",
    documents: "document",
    aiExports: "AI export"
  };
  return resource ? (labels[resource] ?? "usage") : "usage";
}

function resetDateMessage(resetAt: string | null | undefined): string {
  if (resetAt) {
    const date = new Date(resetAt);
    if (!Number.isNaN(date.getTime())) {
      return `Your allowance will reset on ${new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", timeZone: "UTC" }).format(date)}.`;
    }
  }
  return "Your allowance will reset at the beginning of next month.";
}
