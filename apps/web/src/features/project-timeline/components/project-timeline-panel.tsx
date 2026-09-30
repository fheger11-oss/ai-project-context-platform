import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  GitBranch,
  RefreshCw,
  ScrollText
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type {
  ProjectDecisionStatus,
  ProjectTimelineItem,
  RepositoryUpdateTimelineItem
} from "@ai-context/contracts";

import { StatePanel } from "@/components/shared/state-panel";
import { PageHeading } from "@/components/typography/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listProjectTimeline } from "@/features/project-timeline/api/project-timeline-api";

const PAGE_SIZE = 20;

// Exported for focused repository-isolation tests, not as a global key framework.
// eslint-disable-next-line react-refresh/only-export-components
export function projectTimelineQueryKey(repositoryId: string, page: number, pageSize: number) {
  return ["repositories", repositoryId, "timeline", page, pageSize] as const;
}

export function ProjectTimelinePanel({
  accessToken,
  repositoryId
}: {
  accessToken: string;
  repositoryId: string;
}) {
  const [paginationState, setPaginationState] = useState({ repositoryId, page: 1 });
  const page = paginationState.repositoryId === repositoryId ? paginationState.page : 1;

  function setPage(update: (current: number) => number) {
    setPaginationState({ repositoryId, page: update(page) });
  }

  const timelineQuery = useQuery({
    queryKey: projectTimelineQueryKey(repositoryId, page, PAGE_SIZE),
    queryFn: () => listProjectTimeline(accessToken, repositoryId, { page, pageSize: PAGE_SIZE }),
    enabled: Boolean(accessToken && repositoryId)
  });
  const items = timelineQuery.data?.items ?? [];
  const pagination = timelineQuery.data?.pagination;

  return (
    <section className="grid gap-5" aria-labelledby="project-timeline-title">
      <PageHeading
        eyebrow="Project evolution"
        title={<span id="project-timeline-title">Timeline</span>}
        description="A chronological view of important changes, context updates, and project decisions."
      />

      {timelineQuery.isLoading ? (
        <StatePanel
          description="Loading meaningful repository activity."
          title="Loading timeline"
          tone="loading"
        />
      ) : null}

      {timelineQuery.isError ? (
        <StatePanel
          action={
            <Button
              type="button"
              variant="outline"
              disabled={timelineQuery.isFetching}
              onClick={() => void timelineQuery.refetch()}
            >
              <RefreshCw className={timelineQuery.isFetching ? "animate-spin" : undefined} />
              Retry
            </Button>
          }
          description="Timeline activity could not be loaded for this repository."
          title="Timeline unavailable"
          tone="error"
        />
      ) : null}

      {!timelineQuery.isLoading && !timelineQuery.isError && items.length === 0 ? (
        <StatePanel
          description="Meaningful repository activity will appear here as the project evolves."
          title="No timeline activity yet"
          tone="empty"
        />
      ) : null}

      {!timelineQuery.isLoading && !timelineQuery.isError && items.length > 0 ? (
        <div className="relative grid gap-4 pl-6 before:absolute before:inset-y-3 before:left-2 before:w-px before:bg-border">
          {items.map((item) => (
            <TimelineItemCard key={`${item.type}:${item.sourceId}`} item={item} />
          ))}
        </div>
      ) : null}

      {pagination && pagination.total > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {Math.max(1, pagination.totalPages)} · {pagination.total}{" "}
            total
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!pagination.hasPreviousPage || timelineQuery.isFetching}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft />
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!pagination.hasNextPage || timelineQuery.isFetching}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
              <ChevronRight />
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function TimelineItemCard({ item }: { item: ProjectTimelineItem }) {
  const presentation = itemPresentation(item);

  return (
    <article className="relative">
      <span
        aria-hidden="true"
        className="absolute -left-[1.4rem] top-5 size-3 rounded-full border-2 border-background bg-primary"
      />
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <presentation.icon className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0">
              <CardTitle>{presentation.title}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">{formatDate(item.occurredAt)}</p>
            </div>
          </div>
          {presentation.badge}
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">{presentation.content}</CardContent>
      </Card>
    </article>
  );
}

function itemPresentation(item: ProjectTimelineItem): {
  badge: ReactNode;
  content: ReactNode;
  icon: LucideIcon;
  title: string;
} {
  switch (item.type) {
    case "REPOSITORY_CONNECTED":
      return {
        title: "Repository connected",
        icon: GitBranch,
        badge: <Badge tone="success">Connected</Badge>,
        content: (
          <div>
            <p className="font-medium text-foreground">{item.repositoryName}</p>
            <p className="text-muted-foreground">{item.repositoryFullName}</p>
          </div>
        )
      };
    case "REPOSITORY_UPDATE":
      return {
        title: "Repository update",
        icon: RefreshCw,
        badge: <Badge tone={updateStatusTone(item.status)}>{item.status}</Badge>,
        content: <RepositoryUpdateContent item={item} />
      };
    case "CONTEXT_PROMOTED":
      return {
        title: "Context promoted",
        icon: CircleCheck,
        badge: <Badge tone="success">{item.contextVersion}</Badge>,
        content: (
          <dl className="grid gap-2 text-muted-foreground sm:grid-cols-2">
            <Detail label="Context ID" value={item.contextId} mono />
            <Detail
              label="Commit"
              value={abbreviateSha(item.commitSha)}
              title={item.commitSha}
              mono
            />
            <Detail label="Generated" value={formatDate(item.generatedAt)} />
            <div>
              <dt className="text-xs uppercase tracking-wide">Project context</dt>
              <dd className="mt-1">
                <Link
                  className="font-medium text-primary hover:underline"
                  to={`/analyses/${encodeURIComponent(item.analysisId)}#project-context`}
                >
                  View context
                </Link>
              </dd>
            </div>
          </dl>
        )
      };
    case "DECISION_EFFECTIVE":
      return {
        title: item.title,
        icon: ScrollText,
        badge: <Badge tone={decisionStatusTone(item.status)}>{item.status}</Badge>,
        content: (
          <div className="grid gap-3">
            <dl className="grid gap-2 text-muted-foreground sm:grid-cols-2">
              <Detail label="Event" value="Decision effective" />
              <Detail label="Affected area" value={item.affectedArea} />
              <Detail label="Effective date" value={formatDate(item.decidedAt)} />
              <Detail label="Decision ID" value={item.decisionId} mono />
            </dl>
            <Link
              className="w-fit text-sm font-medium text-primary hover:underline"
              to={`/repositories/${encodeURIComponent(item.repositoryId)}/decisions`}
            >
              View decisions
            </Link>
          </div>
        )
      };
  }
}

function RepositoryUpdateContent({ item }: { item: RepositoryUpdateTimelineItem }) {
  return (
    <div className="grid gap-3">
      <dl className="grid gap-2 text-muted-foreground sm:grid-cols-2">
        <Detail label="Trigger" value={triggerLabel(item.triggerType)} />
        <Detail
          label="Commit range"
          value={`${item.baseCommitSha ? abbreviateSha(item.baseCommitSha) : "Initial"} → ${abbreviateSha(item.targetCommitSha)}`}
          title={[item.baseCommitSha, item.targetCommitSha].filter(Boolean).join(" → ")}
          mono
        />
        {item.scanId ? <Detail label="Scan ID" value={item.scanId} mono /> : null}
        {item.analysisId ? <Detail label="Analysis ID" value={item.analysisId} mono /> : null}
        {item.projectContextId ? (
          <Detail label="Context ID" value={item.projectContextId} mono />
        ) : null}
      </dl>
      <div className="flex flex-wrap gap-3">
        <Link
          className="text-sm font-medium text-primary hover:underline"
          to={`/repositories/${encodeURIComponent(item.repositoryId)}#updates`}
        >
          View updates
        </Link>
        {item.analysisId ? (
          <Link
            className="text-sm font-medium text-primary hover:underline"
            to={`/analyses/${encodeURIComponent(item.analysisId)}`}
          >
            View analysis
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function Detail({
  label,
  mono = false,
  title,
  value
}: {
  label: string;
  mono?: boolean;
  title?: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide">{label}</dt>
      <dd
        className={
          mono ? "mt-1 break-all font-mono text-xs text-foreground" : "mt-1 text-foreground"
        }
        title={title}
      >
        {value}
      </dd>
    </div>
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function abbreviateSha(value: string): string {
  return value.slice(0, 7);
}

function triggerLabel(trigger: RepositoryUpdateTimelineItem["triggerType"]): string {
  return trigger === "WEBHOOK" ? "Webhook" : trigger === "SYSTEM" ? "Automatic" : "Manual";
}

function updateStatusTone(status: RepositoryUpdateTimelineItem["status"]) {
  if (status === "COMPLETED") return "success" as const;
  if (status === "FAILED") return "error" as const;
  if (status === "RUNNING") return "running" as const;
  return "pending" as const;
}

function decisionStatusTone(status: ProjectDecisionStatus) {
  return status === "ACTIVE" ? ("success" as const) : ("muted" as const);
}
