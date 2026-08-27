import {
  Archive,
  ArrowRight,
  BarChart3,
  Bot,
  CalendarClock,
  FileText,
  GitBranch,
  Layers3,
  ScanLine
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import type { DashboardProjectSummary } from "@ai-context/contracts";

import { StatusDot } from "@/components/shared/status-dot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { scanStatusLabel, scanStatusTone } from "@/features/scans/utils/scan-status";

type ProjectSummaryCardProps = {
  project: DashboardProjectSummary;
};

function displayDate(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "Not available";
}

function shortCommit(value: string): string {
  return value.length > 12 ? value.slice(0, 12) : value;
}

function primaryAction(project: DashboardProjectSummary): { href: string; label: string } {
  const repositoryHref = `/repositories/${encodeURIComponent(project.repository.id)}`;

  if (!project.latestScan) {
    return {
      href: repositoryHref,
      label: "Start scan"
    };
  }

  if (project.latestScan.status !== "COMPLETED") {
    return {
      href: repositoryHref,
      label: "View scan status"
    };
  }

  if (!project.latestAnalysis) {
    return {
      href: repositoryHref,
      label: "Analyze scan"
    };
  }

  const analysisHref = `/analyses/${encodeURIComponent(project.latestAnalysis.analysisId)}`;

  if (!project.latestContext) {
    return {
      href: analysisHref,
      label: "Generate Context"
    };
  }

  return {
    href: analysisHref,
    label: "Open Context"
  };
}

export function ProjectSummaryCard({ project }: ProjectSummaryCardProps) {
  const { repository, latestAnalysis, latestContext, latestScan } = project;
  const action = primaryAction(project);
  const repositoryHref = `/repositories/${encodeURIComponent(repository.id)}`;
  const stateLabel = latestContext
    ? "Context available"
    : latestScan
      ? "Scan available"
      : "No scan";

  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone={repository.visibility === "PRIVATE" ? "muted" : "success"}>
                {repository.visibility.toLowerCase()}
              </Badge>
              {repository.isArchived ? (
                <Badge tone="warning">
                  <Archive className="size-3" />
                  Archived
                </Badge>
              ) : null}
              {repository.language ? <Badge tone="neutral">{repository.language}</Badge> : null}
            </div>
            <p className="truncate text-sm text-muted-foreground">{repository.owner}</p>
            <CardTitle className="mt-1 truncate text-base font-semibold" title={repository.name}>
              {repository.name}
            </CardTitle>
            <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
              {repository.fullName}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            <StatusDot
              active={Boolean(latestContext)}
              tone={latestContext ? "success" : latestScan ? "running" : "muted"}
            />
            {stateLabel}
          </span>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4">
        <p className="line-clamp-2 min-h-12 text-sm leading-6 text-muted-foreground">
          {repository.description ?? "No description provided."}
        </p>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <SummaryFact
            icon={GitBranch}
            label="Default branch"
            value={repository.defaultBranch}
            mono
          />
          <SummaryFact
            icon={CalendarClock}
            label="Last synced"
            value={displayDate(repository.lastSyncedAt)}
          />
        </dl>

        <section
          className="grid gap-3 rounded-md border bg-surface/60 p-3"
          aria-label="Scan summary"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="inline-flex items-center gap-2 text-sm font-medium">
              <ScanLine className="size-4 text-muted-foreground" />
              Latest scan
            </h3>
            {latestScan ? (
              <Badge tone={scanStatusTone(latestScan.status)}>
                {scanStatusLabel(latestScan.status)}
              </Badge>
            ) : (
              <Badge tone="unavailable">No scan</Badge>
            )}
          </div>

          {latestScan ? (
            <dl className="grid gap-2 text-xs text-muted-foreground">
              <SummaryLine label="Created" value={displayDate(latestScan.createdAt)} />
              <SummaryLine
                label="Commit"
                value={shortCommit(latestScan.commitSha)}
                title={latestScan.commitSha}
              />
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              Open the project workspace to start the first repository scan.
            </p>
          )}
        </section>

        <dl className="grid gap-2 text-sm">
          <CapabilityRow
            available={Boolean(latestAnalysis)}
            icon={BarChart3}
            label="Analysis"
            value={
              latestAnalysis
                ? `Available ${displayDate(latestAnalysis.generatedAt)}`
                : "Not available"
            }
          />
          <CapabilityRow
            available={Boolean(latestContext)}
            icon={Layers3}
            label="Context"
            value={latestContext ? latestContext.contextVersion : "Not available"}
          />
          <CapabilityRow
            available={project.documents.available}
            icon={FileText}
            label="Documents"
            value={`${project.documents.count} generated`}
          />
          <CapabilityRow
            available={project.aiExport.available}
            icon={Bot}
            label="AI Export"
            value={project.aiExport.available ? "Available from Context" : "Not available"}
          />
        </dl>

        <div className="grid gap-2 border-t border-border/70 pt-3 sm:flex sm:flex-wrap sm:justify-end">
          <Button asChild size="sm" variant="outline">
            <Link to={repositoryHref}>Open Project</Link>
          </Button>
          <Button asChild size="sm">
            <Link to={action.href}>
              {action.label}
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryFact({
  icon: Icon,
  label,
  mono = false,
  value
}: {
  icon: LucideIcon;
  label: string;
  mono?: boolean;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-md border bg-background/45 p-3">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </dt>
      <dd
        className={mono ? "mt-1 truncate font-mono text-xs" : "mt-1 truncate text-foreground"}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

function SummaryLine({ label, title, value }: { label: string; title?: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <dt>{label}</dt>
      <dd className="truncate font-mono text-subtle-foreground" title={title ?? value}>
        {value}
      </dd>
    </div>
  );
}

function CapabilityRow({
  available,
  icon: Icon,
  label,
  value
}: {
  available: boolean;
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-md border bg-surface/60 p-3">
      <dt className="flex min-w-0 items-center gap-2 text-muted-foreground">
        <Icon className="size-4 shrink-0" />
        <span className="truncate">{label}</span>
      </dt>
      <dd className="flex min-w-0 items-center gap-2 text-right">
        <StatusDot active={available} tone={available ? "success" : "muted"} />
        <span className="truncate text-xs text-subtle-foreground" title={value}>
          {value}
        </span>
      </dd>
    </div>
  );
}
