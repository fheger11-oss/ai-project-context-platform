import { Link } from "react-router-dom";
import type { RepositoryStateSummary, RepositoryUpdateSummary } from "@ai-context/contracts";

import { StatusDot } from "@/components/shared/status-dot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ProjectContextStatusProps = {
  contextGeneratedAt: string | null;
  currentUpdate: RepositoryUpdateSummary | null;
  isLoading: boolean;
  projectStateHref: string;
  state: RepositoryStateSummary | null;
  updatesHref: string;
};

function displayDate(value: string): string {
  return new Date(value).toLocaleString();
}

function shortCommit(value: string): string {
  return value.length > 12 ? value.slice(0, 12) : value;
}

export function ProjectContextStatus({
  contextGeneratedAt,
  currentUpdate,
  isLoading,
  projectStateHref,
  state,
  updatesHref
}: ProjectContextStatusProps) {
  const activeUpdate = currentUpdate?.status === "PENDING" || currentUpdate?.status === "RUNNING";
  const updateFailed =
    currentUpdate?.status === "FAILED" || state?.freshnessStatus === "UPDATE_FAILED";
  const hasPreviousContext = Boolean(
    state?.currentProjectContextId || state?.currentContextCommitSha
  );

  let label = "Freshness unavailable";
  let description = "Ctxaro could not currently verify the latest GitHub state.";
  let badgeTone: "error" | "running" | "success" | "unavailable" | "warning" = "unavailable";
  let dotTone: "error" | "running" | "success" | "unavailable" | "warning" = "unavailable";
  let action: "refresh" | "update" | "updates" | null = "refresh";

  if (activeUpdate) {
    label = "Updating Project Context";
    description =
      "Ctxaro is processing the latest repository changes. This may take a few moments.";
    badgeTone = "running";
    dotTone = "running";
    action = "updates";
  } else if (updateFailed) {
    label = "Update failed";
    description = hasPreviousContext
      ? "The latest update did not complete. Your previous Project Context is still available."
      : "The latest update did not complete. Review the update for more information.";
    badgeTone = "error";
    dotTone = "error";
    action = "updates";
  } else if (isLoading) {
    label = "Checking freshness";
    description = "Loading the authoritative Project Context state.";
    badgeTone = "running";
    dotTone = "running";
    action = null;
  } else if (state?.freshnessStatus === "STALE") {
    label = "Context needs updating";
    description =
      "New repository changes were detected. Your current Project Context is not based on the latest commit.";
    badgeTone = "warning";
    dotTone = "warning";
    action = "update";
  } else if (state?.freshnessStatus === "FRESH") {
    label = "Fresh";
    description = "Your Project Context matches the latest verified GitHub commit.";
    badgeTone = "success";
    dotTone = "success";
    action = null;
  }

  return (
    <div
      className="mt-4 flex flex-col gap-3 rounded-md border border-border bg-surface/60 p-3 sm:flex-row sm:items-center sm:justify-between"
      aria-live={activeUpdate || isLoading ? "polite" : undefined}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusDot active={activeUpdate} tone={dotTone} />
          <Badge tone={badgeTone}>{label}</Badge>
          {state?.currentContextCommitSha ? (
            <span
              className="font-mono text-xs text-muted-foreground"
              title={state.currentContextCommitSha}
            >
              context {shortCommit(state.currentContextCommitSha)}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
        {contextGeneratedAt ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Context generated {displayDate(contextGeneratedAt)}
          </p>
        ) : state?.remoteHeadCheckedAt ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Last verified {displayDate(state.remoteHeadCheckedAt)}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {action === "refresh" ? (
          <Button asChild size="sm" variant="outline">
            <Link to={projectStateHref}>Recheck freshness</Link>
          </Button>
        ) : null}
        {action === "update" ? (
          <Button asChild size="sm">
            <Link to={projectStateHref}>Update Context</Link>
          </Button>
        ) : null}
        {action === "updates" ? (
          <Button asChild size="sm" variant="outline">
            <Link to={updatesHref}>View updates</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
