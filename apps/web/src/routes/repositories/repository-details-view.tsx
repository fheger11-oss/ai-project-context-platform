import {
  ArrowLeft,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  GitBranch,
  GitFork,
  Layers3,
  RefreshCw,
  ScanLine,
  Star
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { StatePanel } from "@/components/shared/state-panel";
import { StatusDot } from "@/components/shared/status-dot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getGitHubLoginUrl } from "@/features/auth/api/auth-api";
import { useAuthSessionStore } from "@/features/auth/stores/auth-session-store";
import { listDashboardProjects } from "@/features/dashboard/api/dashboard-api";
import { getRepository, syncRepository } from "@/features/repositories/api/repositories-api";
import type { RepositorySummary } from "@/features/repositories/api/repositories-api";
import { getScanHistory, type ScanSnapshot } from "@/features/scans/api/scan-api";
import { StartAnalysisButton } from "@/features/analysis/components/start-analysis-button";
import { RepositoryScanAction } from "@/features/scans/components/repository-scan-action";
import { ScanHistory } from "@/features/scans/components/scan-history";
import { limitReasonLabel } from "@/features/scans/utils/scan-usage";
import { scanStatusLabel, scanStatusTone } from "@/features/scans/utils/scan-status";
import { productPipelineStages, type ProductPipelineStageKey } from "@/lib/product-pipeline";
import type { DashboardProjectSummary } from "@ai-context/contracts";

function repositoryName(fullName: string): string {
  const parts = fullName.split("/");

  return parts[1] ?? fullName;
}

function displayDate(value: string): string {
  return new Date(value).toLocaleString();
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
  const dashboardProjectsQuery = useQuery({
    queryKey: ["dashboard", "projects"],
    queryFn: () => listDashboardProjects(apiAccessToken),
    enabled: Boolean(apiAccessToken && id)
  });
  const syncMutation = useMutation({
    mutationFn: () => syncRepository(apiAccessToken, id ?? ""),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard", "projects"] }),
        queryClient.invalidateQueries({ queryKey: ["repositories"] }),
        queryClient.invalidateQueries({ queryKey: ["repositories", id] })
      ]);
    }
  });
  const repository = repositoryQuery.data;
  const latestScan = latestScanQuery.data?.items[0] ?? null;
  const projectSummary =
    dashboardProjectsQuery.data?.projects.find((project) => project.repository.id === id) ?? null;

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
        description="This project workspace could not be loaded."
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-4">
          <ProjectPipeline
            latestScan={latestScan}
            projectSummary={projectSummary}
            repositoryLoaded
          />
          <ScanHistory accessToken={apiAccessToken} repositoryId={repository.id} />
          <ProjectMetadata repository={repository} />
        </div>

        <aside className="grid content-start gap-3" aria-label="Project actions">
          <RepositoryScanAction accessToken={apiAccessToken} repositoryId={repository.id} />
          <WorkflowAccess
            isLoading={dashboardProjectsQuery.isLoading}
            isError={dashboardProjectsQuery.isError}
            latestScan={latestScan}
            projectSummary={projectSummary}
            repositoryId={repository.id}
            accessToken={apiAccessToken}
          />
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
        <div className="flex shrink-0 flex-wrap items-center gap-3 text-sm text-muted-foreground">
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
  projectSummary,
  repositoryLoaded
}: {
  latestScan: ScanSnapshot | null;
  projectSummary: DashboardProjectSummary | null;
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
        <ol className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-6">
          {productPipelineStages.map((stage) => {
            const state = stageState(stage.key, repositoryLoaded, latestScan, projectSummary);

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
                  <span className="min-w-0 break-words text-sm font-medium text-foreground">
                    {stage.label}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {stageDescription(stage.key, latestScan, projectSummary)}
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
  key: ProductPipelineStageKey,
  repositoryLoaded: boolean,
  latestScan: ScanSnapshot | null,
  projectSummary: DashboardProjectSummary | null
): "active" | "complete" | "unavailable" {
  if (key === "repository" && repositoryLoaded) {
    return "complete";
  }

  if (key === "scan" && latestScan) {
    return latestScan.status === "COMPLETED" ? "complete" : "active";
  }

  if (key === "analysis") {
    if (projectSummary?.latestAnalysis) {
      return "complete";
    }

    return latestScan?.status === "COMPLETED" ? "active" : "unavailable";
  }

  if (key === "context") {
    if (projectSummary?.latestContext) {
      return "complete";
    }

    return projectSummary?.latestAnalysis ? "active" : "unavailable";
  }

  if (key === "documents") {
    if (projectSummary?.documents.available) {
      return "complete";
    }

    return projectSummary?.latestContext ? "active" : "unavailable";
  }

  if (key === "ai-export") {
    if (projectSummary?.aiExport.available) {
      return "complete";
    }

    return projectSummary?.latestContext ? "active" : "unavailable";
  }

  return "unavailable";
}

function stageDescription(
  key: ProductPipelineStageKey,
  latestScan: ScanSnapshot | null,
  projectSummary: DashboardProjectSummary | null
): string {
  if (key === "repository") {
    return "Connected source project.";
  }

  if (key === "scan") {
    return latestScan
      ? latestScan.limit.reached
        ? `Latest scan failed: ${limitReasonLabel(latestScan.limit.reason).toLowerCase()}.`
        : `Latest scan ${scanStatusLabel(latestScan.status).toLowerCase()}.`
      : "Start a repository scan.";
  }

  if (key === "analysis") {
    return projectSummary?.latestAnalysis
      ? "Analysis is available."
      : "Available from completed scan history.";
  }

  if (key === "context") {
    return projectSummary?.latestContext
      ? `Context ${projectSummary.latestContext.contextVersion}.`
      : "Generated from an analysis.";
  }

  if (key === "documents") {
    return projectSummary?.documents.available
      ? `${projectSummary.documents.count} generated document${
          projectSummary.documents.count === 1 ? "" : "s"
        }.`
      : "Generated from project context.";
  }

  return projectSummary?.aiExport.available
    ? "Available from Project Context."
    : "Available after project context exists.";
}

function WorkflowAccess({
  accessToken,
  isError,
  isLoading,
  latestScan,
  projectSummary,
  repositoryId
}: {
  accessToken: string;
  isError: boolean;
  isLoading: boolean;
  latestScan: ScanSnapshot | null;
  projectSummary: DashboardProjectSummary | null;
  repositoryId: string;
}) {
  const analysisHref = projectSummary?.latestAnalysis
    ? `/analyses/${encodeURIComponent(projectSummary.latestAnalysis.analysisId)}`
    : null;
  const canAnalyzeLatestScan = Boolean(
    latestScan?.status === "COMPLETED" && !projectSummary?.latestAnalysis
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow access</CardTitle>
        <CardDescription>
          Open existing analysis, Context, document, and AI export workflows.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {isLoading ? (
          <StatePanel
            className="p-3"
            description="Loading verified project workflow state."
            title="Loading workflow access"
            tone="loading"
          />
        ) : null}

        {isError ? (
          <StatePanel
            className="p-3"
            description="Workflow availability could not be loaded."
            title="Workflow access unavailable"
            tone="error"
          />
        ) : null}

        {!isLoading && !isError ? (
          <>
            <WorkflowRow
              available={Boolean(projectSummary?.latestAnalysis)}
              icon={BarChart3}
              label="Analysis"
              value={
                projectSummary?.latestAnalysis
                  ? "Completed analysis available"
                  : "Available from completed scan history"
              }
              href={analysisHref}
              actionLabel="Open analysis"
            />
            {canAnalyzeLatestScan && latestScan ? (
              <div className="grid gap-2 rounded-md border border-dashed p-3">
                <p className="text-sm font-medium text-foreground">Latest scan is ready</p>
                <p className="text-xs leading-5 text-muted-foreground">
                  Analyze this completed scan to continue the project workflow.
                </p>
                <StartAnalysisButton
                  accessToken={accessToken}
                  label="Analyze latest scan"
                  pendingLabel="Analyzing latest scan"
                  scanId={latestScan.id}
                />
              </div>
            ) : null}
            <WorkflowRow
              available={Boolean(projectSummary?.latestContext)}
              icon={Layers3}
              label="Project Context"
              value={
                projectSummary?.latestContext?.contextVersion ??
                (projectSummary?.latestAnalysis
                  ? "Generated from analysis"
                  : "Waiting for analysis")
              }
              href={analysisHref}
              actionLabel={projectSummary?.latestContext ? "Open Context" : "Open Context workflow"}
            />
            <WorkflowRow
              available={Boolean(projectSummary?.documents.available)}
              icon={FileText}
              label="Documents"
              value={`${projectSummary?.documents.count ?? 0} generated`}
              href={projectSummary?.latestContext ? analysisHref : null}
              actionLabel="Open Documents"
            />
            <WorkflowRow
              available={Boolean(projectSummary?.aiExport.available)}
              icon={Bot}
              label="AI Export"
              value={
                projectSummary?.aiExport.available
                  ? "Available from Project Context"
                  : "Available after Context exists"
              }
              href={projectSummary?.latestContext ? analysisHref : null}
              actionLabel="Open AI Export"
            />
          </>
        ) : null}

        <Button asChild variant="utility">
          <Link to={`/repositories/${encodeURIComponent(repositoryId)}`}>
            <GitBranch />
            Project workspace
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function WorkflowRow({
  actionLabel,
  available,
  href,
  icon: Icon,
  label,
  value
}: {
  actionLabel: string;
  available: boolean;
  href: string | null;
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="grid gap-3 rounded-md border bg-surface/60 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Icon className="size-4 text-muted-foreground" />
            {label}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{value}</p>
        </div>
        <Badge className="w-fit" tone={available ? "success" : "muted"}>
          {available ? "Available" : "Waiting"}
        </Badge>
      </div>
      {href ? (
        <Button asChild size="sm" variant="outline">
          <Link to={href}>
            {actionLabel}
            <ExternalLink />
          </Link>
        </Button>
      ) : null}
    </div>
  );
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
