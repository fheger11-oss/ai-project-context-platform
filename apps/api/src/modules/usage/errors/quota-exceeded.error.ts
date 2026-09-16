import { HttpException, HttpStatus } from "@nestjs/common";

export type UsageQuotaResource =
  "repositories" | "scans" | "analyses" | "contexts" | "documents" | "aiExports";

export type QuotaExceededDetails = {
  resource: UsageQuotaResource;
  limit: number;
  currentUsage: number;
  resetAt: Date | null;
};

export class QuotaExceededError extends HttpException {
  readonly details: QuotaExceededDetails;

  constructor(details: QuotaExceededDetails) {
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: quotaMessage(details.resource),
        error: "Quota Exceeded",
        quota: {
          resource: details.resource,
          limit: details.limit,
          currentUsage: details.currentUsage,
          resetAt: details.resetAt ? details.resetAt.toISOString() : null
        }
      },
      HttpStatus.TOO_MANY_REQUESTS
    );
    this.name = "QuotaExceededError";
    this.details = details;
  }
}

function quotaMessage(resource: UsageQuotaResource): string {
  switch (resource) {
    case "repositories":
      return "You have reached your connected repository limit.";
    case "scans":
      return "You have reached your monthly scan limit.";
    case "analyses":
      return "You have reached your monthly analysis limit.";
    case "contexts":
      return "You have reached your monthly project context limit.";
    case "documents":
      return "You have reached your monthly document limit.";
    case "aiExports":
      return "You have reached your monthly AI export limit.";
  }
}
