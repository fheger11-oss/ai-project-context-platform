import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  GitBranch,
  GitFork,
  RefreshCw,
  ScanLine,
  Star
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { StatePanel } from "@/components/shared/state-panel";
import { StatusDot } from "@/components/shared/status-dot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getGitHubLoginUrl } from "@/features/auth/api/auth-api";
import { useAuthSessionStore } from "@/features/auth/stores/auth-session-store";
import { getRepository, syncRepository } from "@/features/repositories/api/repositories-api";
import type { RepositorySummary } from "@/features/repositories/api/repositories-api";
import { getScanHistory, type ScanSnapshot } from "@/features/scans/api/scan-api";
import { RepositoryScanAction } from "@/features/scans/components/repository-scan-action";
import { ScanHistory } from "@/features/scans/components/scan-history";

const pipelineStages = [
  { key: "repository", label: "Repository" },
  { key: "scan", label: "Scan" },
  { key: "analysis", label: "Analysis" },
  { key: "context", label: "Context" },
  { key: "documents", label: "Documents" },
  { key: "ai-export", label: "AI Export" }
] as const;

function repositoryName(fullName: string): string {
  const parts = fullName.split("/");

  return parts[1] ?? fullName;
}

function displayDate(value: string): string {
  return new Date(value).toLocaleString();
}

function scanStatusLabel(status: ScanSnapshot["status"]): string {
  if (status === "COMPLETED") {
    return "Completed";
  }

  if (status === "RUNNING") {
    return "Running";
  }

  if (status === "PENDING") {
    return "Pending";
  }

  if (status === "FAILED") {
    return "Failed";
  }

  return "Cancelled";
}

function scanStatusTone(
  status: ScanSnapshot["status"]
): "error" | "muted" | "pending" | "running" | "success" {
  if (status === "COMPLETED") {
    return "success";
  }

  if (status === "FAILED") {
    return "error";
  }

  if (status === "RUNNING") {
    return "running";
  }

  if (status === "PENDING") {
    return "pending";
  }

  return "muted";
}

export function RepositoryDetailsView() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const apiAccessToken = useAuthSessionStore((state) => state.accessToken);
  const repositoryQuery = useQuery({
    queryKey: ["repositories", id],
    queryFn: () => getRepository(apiAccessToken, id ?? ""),
    enabled: Boolean(apiAccessToken && id)
  });
  const latestScanQuery = useQuery({
    queryKey: ["scan-history", id, 1, 1],
    queryFn: () => getScanHistory(apiAccessToken, id ?? "", 1, 1),
    enabled: Boolean(apiAccessToken && id)
  });
  const syncMutation = useMutation({
    mutationFn: () => syncRepository(apiAccessToken, id ?? ""),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["repositories"] }),
        queryClient.invalidateQueries({ queryKey: ["repositories", id] })
      ]);
    }
  });
  const repository = repositoryQuery.data;
  const latestScan = latestScanQuery.data?.items[0] ?? null;

  if (!apiAccessToken) {
    return (
      <StatePanel
        action={
          <Button asChild>
            <a href={getGitHubLoginUrl()}>Sign in with GitHub</a>
          </Button>
        }
        className="min-h-[320px]"
        description="Sign in with GitHub to load this project workspace."
        title="Session required"
        tone="empty"
      />
    );
  }

  if (repositoryQuery.isLoading) {
    return (
      <StatePanel
        className="min-h-[320px]"
        description="Loading project identity, repository metadata, and recent scan state."
        title="Loading project workspace"
        tone="loading"
      />
    );
  }

  if (repositoryQuery.isError) {
    return (
      <StatePanel
        action={
          <Button
            type="button"
            variant="outline"
            disabled={repositoryQuery.isFetching}
            onClick={() => void repositoryQuery.refetch()}
          >
            <RefreshCw />
            Retry
          </Button>
        }
        className="min-h-[320px]"
        description="The repository service could not load this project workspace."
        title="Project unavailable"
        tone="error"
      />
    );
  }

  if (!repository) {
    return (
      <StatePanel
        className="min-h-[320px]"
        description="No repository data was returned for this project."
        title="Project not found"
        tone="empty"
      />
    );
  }

  return (
    <section className="grid gap-5">
      <ProjectHeader repository={repository} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-4">
          <ProjectPipeline latestScan={latestScan} repositoryLoaded />
          <ScanHistory accessToken={apiAccessToken} repositoryId={repository.id} />
          <ProjectMetadata repository={repository} />
        </div>

        <aside className="grid content-start gap-3" aria-label="Project actions">
          <RepositoryScanAction accessToken={apiAccessToken} repositoryId={repository.id} />
          <Card>
            <CardHeader>
              <CardTitle>Repository source</CardTitle>
              <CardDescription>
                Refresh stored metadata or open the connected GitHub project.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button asChild variant="outline">
                <a href={repository.htmlUrl} target="_blank" rel="noreferrer">
                  <ExternalLink />
                  Open GitHub
                </a>
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={syncMutation.isPending}
                aria-busy={syncMutation.isPending}
                onClick={() => syncMutation.mutate()}
              >
                <RefreshCw className={syncMutation.isPending ? "animate-spin" : undefined} />
                {syncMutation.isPending ? "Syncing" : "Sync metadata"}
              </Button>
              <Button asChild variant="utility">
                <Link to="/repositories">
                  <ArrowLeft />
                  Back to projects
                </Link>
              </Button>
              <div aria-live="polite">
                {syncMutation.isSuccess ? (
                  <p className="text-sm text-primary">Repository metadata synchronized.</p>
                ) : null}
                {syncMutation.isError ? (
                  <p className="text-sm text-destructive" role="alert">
                    Metadata sync failed.
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
          <CurrentState repository={repository} latestScan={latestScan} />
        </aside>
      </div>
    </section>
  );
}

function ProjectHeader({ repository }: { repository: RepositorySummary }) {
  return (
    <header className="rounded-md border border-border bg-card/70 p-5 shadow-[var(--shadow-control)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone={repository.visibility === "PRIVATE" ? "muted" : "success"}>
              {repository.visibility.toLowerCase()}
            </Badge>
            {repository.isArchived ? <Badge tone="warning">Archived</Badge> : null}
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <GitBranch className="size-3.5" />
              {repository.defaultBranch}
            </span>
          </div>
          <p className="truncate text-sm text-muted-foreground">{repository.owner}</p>
          <h1 className="mt-1 truncate text-3xl font-semibold leading-tight text-foreground">
            {repositoryName(repository.fullName)}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
            {repository.description ?? "No repository description provided."}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Star className="size-4" />
            {repository.stars}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <GitFork className="size-4" />
            {repository.forks}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <StatusDot active tone="success" />
            Connected
          </span>
        </div>
      </div>
    </header>
  );
}

function ProjectPipeline({
  latestScan,
  repositoryLoaded
}: {
  latestScan: ScanSnapshot | null;
  repositoryLoaded: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Project pipeline</CardTitle>
        <CardDescription>
          Repository context moves through scan, analysis, context, documents, and AI export.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          {pipelineStages.map((stage) => {
            const state = stageState(stage.key, repositoryLoaded, latestScan);

            return (
              <li key={stage.key} className="rounded-md border border-border bg-surface/65 p-3">
                <div className="flex items-center gap-2">
                  {state === "complete" ? (
                    <CheckCircle2 aria-hidden="true" className="size-4 text-success" />
                  ) : state === "active" ? (
                    <ScanLine aria-hidden="true" className="size-4 text-primary" />
                  ) : (
                    <Clock3 aria-hidden="true" className="size-4 text-muted-foreground" />
                  )}
                  <span className="truncate text-sm font-medium text-foreground">
                    {stage.label}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {stageDescription(stage.key, latestScan)}
                </p>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

function stageState(
  key: (typeof pipelineStages)[number]["key"],
  repositoryLoaded: boolean,
  latestScan: ScanSnapshot | null
): "active" | "complete" | "unavailable" {
  if (key === "repository" && repositoryLoaded) {
    return "complete";
  }

  if (key === "scan" && latestScan) {
    return latestScan.status === "COMPLETED" ? "complete" : "active";
  }

  return "unavailable";
}

function stageDescription(
  key: (typeof pipelineStages)[number]["key"],
  latestScan: ScanSnapshot | null
): string {
  if (key === "repository") {
    return "Connected source project.";
  }

  if (key === "scan") {
    return latestScan
      ? `Latest scan ${scanStatusLabel(latestScan.status).toLowerCase()}.`
      : "Start a repository scan.";
  }

  if (key === "analysis") {
    return "Available from completed scan history.";
  }

  if (key === "context") {
    return "Generated from an analysis.";
  }

  if (key === "documents") {
    return "Generated from project context.";
  }

  return "No workspace route yet.";
}

function CurrentState({
  latestScan,
  repository
}: {
  latestScan: ScanSnapshot | null;
  repository: RepositorySummary;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Current state</CardTitle>
        <CardDescription>Based on repository metadata and latest scan history.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Connection</span>
          <span className="inline-flex items-center gap-1.5 text-subtle-foreground">
            <StatusDot active tone="success" />
            Connected
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Default branch</span>
          <span className="truncate font-mono text-xs text-subtle-foreground">
            {repository.defaultBranch}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Latest scan</span>
          {latestScan ? (
            <Badge tone={scanStatusTone(latestScan.status)}>
              {scanStatusLabel(latestScan.status)}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">No scan yet</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectMetadata({ repository }: { repository: RepositorySummary }) {
  const rows = [
    ["GitHub ID", repository.githubId],
    ["Full name", repository.fullName],
    ["Language", repository.language ?? "Unknown"],
    ["Clone URL", repository.cloneUrl],
    ["Updated on GitHub", displayDate(repository.githubUpdatedAt)],
    ["Last synced", displayDate(repository.lastSyncedAt)]
  ] as const;

  return (
    <details className="rounded-md border border-border bg-card/60">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
        Technical details
      </summary>
      <dl className="grid gap-px border-t bg-border sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0 bg-card/95 p-4">
            <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
            <dd className="mt-1 truncate font-mono text-xs text-subtle-foreground" title={value}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
