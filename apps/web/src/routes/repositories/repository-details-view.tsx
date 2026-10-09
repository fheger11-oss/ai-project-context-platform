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
import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { StatePanel } from "@/components/shared/state-panel";
import { ErrorNotice } from "@/components/shared/error-notice";
import { StatusDot } from "@/components/shared/status-dot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TechnicalText } from "@/components/ui/technical-text";
import { getGitHubLoginUrl } from "@/features/auth/api/auth-api";
import { useAuthSessionStore } from "@/features/auth/stores/auth-session-store";
import { listDashboardProjects } from "@/features/dashboard/api/dashboard-api";
import {
  disableRepositoryAutomation,
  getCurrentRepositoryUpdate,
  getRepository,
  getRepositoryAutomationStatus,
  getRepositoryUpdateHistory,
  reconcileRepositoryAutomation,
  refreshRepositoryState,
  runRepositoryUpdate,
  syncRepository
} from "@/features/repositories/api/repositories-api";
import type { RepositorySummary } from "@/features/repositories/api/repositories-api";
import { AutomaticUpdatesPanel } from "@/features/repositories/components/automatic-updates-panel";
import { getScanHistory, type ScanSnapshot } from "@/features/scans/api/scan-api";
import { StartAnalysisButton } from "@/features/analysis/components/start-analysis-button";
import { RepositoryScanAction } from "@/features/scans/components/repository-scan-action";
import { ScanHistory } from "@/features/scans/components/scan-history";
import { limitReasonLabel } from "@/features/scans/utils/scan-usage";
import { scanStatusLabel, scanStatusTone } from "@/features/scans/utils/scan-status";
import { analytics } from "@/lib/analytics";
import { userFacingError } from "@/lib/api-error";
import { productPipelineStages, type ProductPipelineStageKey } from "@/lib/product-pipeline";
import type {
  DashboardProjectSummary,
  RepositoryUpdateResponse,
  RepositoryUpdateSummary
} from "@ai-context/contracts";

function repositoryName(fullName: string): string {
  const parts = fullName.split("/");

  return parts[1] ?? fullName;
}

function displayDate(value: string): string {
  return new Date(value).toLocaleString();
}

function shortCommit(value: string): string {
  return value.length > 12 ? value.slice(0, 12) : value;
}

function freshnessLabel(value: DashboardProjectSummary["state"] | null): string {
  if (!value) {
    return "Unknown";
  }

  if (value.freshnessStatus === "UPDATE_FAILED") {
    return "Update failed";
  }

  return value.freshnessStatus.toLowerCase().replace(/^\w/, (char) => char.toUpperCase());
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
  const automationStatusQuery = useQuery({
    queryKey: ["repositories", id, "automation"],
    queryFn: () => getRepositoryAutomationStatus(apiAccessToken, id ?? ""),
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
  const updateHistoryQuery = useQuery({
    queryKey: ["repositories", id, "updates", 1, 5],
    queryFn: () => getRepositoryUpdateHistory(apiAccessToken, id ?? "", 1, 5),
    enabled: Boolean(apiAccessToken && id)
  });
  const currentUpdateQuery = useQuery({
    queryKey: ["repositories", id, "updates", "current"],
    queryFn: () => getCurrentRepositoryUpdate(apiAccessToken, id ?? ""),
    enabled: Boolean(apiAccessToken && id)
  });
  const syncMutation = useMutation({
    mutationFn: () => syncRepository(apiAccessToken, id ?? ""),
    onSuccess: async () => {
      analytics.track("repository_sync_completed");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard", "projects"] }),
        queryClient.invalidateQueries({ queryKey: ["repositories"] }),
        queryClient.invalidateQueries({ queryKey: ["repositories", id] })
      ]);
    },
    onError: () => {
      analytics.track("repository_sync_failed", { reason: "UNKNOWN" });
    }
  });
  const refreshStateMutation = useMutation({
    mutationFn: () => refreshRepositoryState(apiAccessToken, id ?? ""),
    onSuccess: async () => {
      analytics.track("repository_state_refresh_completed");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard", "projects"] }),
        queryClient.invalidateQueries({ queryKey: ["repositories", id, "state"] })
      ]);
    },
    onError: () => {
      analytics.track("repository_state_refresh_failed", { reason: "UNKNOWN" });
    }
  });
  const repositoryUpdateMutation = useMutation({
    mutationFn: () => runRepositoryUpdate(apiAccessToken, id ?? ""),
    onSuccess: async (result) => {
      analytics.track("repository_update_completed", { noop: result.noop });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard", "projects"] }),
        queryClient.invalidateQueries({ queryKey: ["repositories", id, "state"] }),
        queryClient.invalidateQueries({ queryKey: ["scan-history", id] }),
        queryClient.invalidateQueries({ queryKey: ["repositories", id, "updates"] })
      ]);
    },
    onError: () => {
      analytics.track("repository_update_failed", { reason: "UNKNOWN" });
    }
  });
  const reconcileAutomationMutation = useMutation({
    mutationFn: () => reconcileRepositoryAutomation(apiAccessToken, id ?? ""),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["repositories", id, "automation"] }),
        queryClient.invalidateQueries({ queryKey: ["repositories", id] })
      ]);
    }
  });
  const disableAutomationMutation = useMutation({
    mutationFn: () => disableRepositoryAutomation(apiAccessToken, id ?? ""),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["repositories", id, "automation"] }),
        queryClient.invalidateQueries({ queryKey: ["repositories", id] })
      ]);
    }
  });
  const repository = repositoryQuery.data;
  const latestScan = latestScanQuery.data?.items[0] ?? null;
  const projectSummary =
    dashboardProjectsQuery.data?.projects.find((project) => project.repository.id === id) ?? null;
  const currentUpdate = currentUpdateQuery.data?.update ?? null;

  function handleSyncRepository() {
    if (syncMutation.isPending) {
      return;
    }

    analytics.track("repository_sync_started");
    syncMutation.mutate();
  }

  if (!apiAccessToken) {
    return (
      <StatePanel
        action={
          <Button asChild>
            <a
              href={getGitHubLoginUrl()}
              onClick={() => analytics.track("github_login_started", { method: "github" })}
            >
              Sign in with GitHub
            </a>
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
    <section id="overview" className="grid scroll-mt-40 gap-5">
      <ProjectHeader repository={repository} />
      <ProjectWorkflowRecommendation
        accessToken={apiAccessToken}
        currentUpdate={currentUpdate}
        isLoading={
          latestScanQuery.isLoading ||
          dashboardProjectsQuery.isLoading ||
          currentUpdateQuery.isLoading
        }
        latestScan={latestScan}
        projectSummary={projectSummary}
        repositoryId={repository.id}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-4">
          <ProjectPipeline
            latestScan={latestScan}
            projectSummary={projectSummary}
            repositoryLoaded
          />
          <RepositoryUpdatesPanel
            currentUpdate={currentUpdate}
            history={updateHistoryQuery.data?.items ?? []}
            isError={updateHistoryQuery.isError || currentUpdateQuery.isError}
            isLoading={updateHistoryQuery.isLoading || currentUpdateQuery.isLoading}
          />
          <ScanHistory accessToken={apiAccessToken} repositoryId={repository.id} />
          <ProjectMetadata repository={repository} />
        </div>

        <aside className="grid content-start gap-3" aria-label="Project actions">
          {latestScan?.status === "COMPLETED" ? (
            <RepositoryScanAction
              accessToken={apiAccessToken}
              buttonVariant="outline"
              repositoryId={repository.id}
            />
          ) : null}
          <AutomaticUpdatesPanel
            disableError={disableAutomationMutation.error}
            error={automationStatusQuery.error}
            isDisabling={disableAutomationMutation.isPending}
            isLoading={automationStatusQuery.isLoading}
            isReconciling={reconcileAutomationMutation.isPending}
            isRetryingStatus={automationStatusQuery.isFetching}
            onDisable={(onSuccess) => disableAutomationMutation.mutate(undefined, { onSuccess })}
            onReconcile={() => reconcileAutomationMutation.mutate()}
            onRetryStatus={() => void automationStatusQuery.refetch()}
            reconcileError={reconcileAutomationMutation.error}
            status={automationStatusQuery.data}
          />
          <WorkflowAccess
            isLoading={dashboardProjectsQuery.isLoading}
            isError={dashboardProjectsQuery.isError}
            projectSummary={projectSummary}
            repositoryId={repository.id}
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
                onClick={handleSyncRepository}
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
          <CurrentState
            repository={repository}
            latestScan={latestScan}
            projectSummary={projectSummary}
            isRefreshing={refreshStateMutation.isPending}
            isUpdating={repositoryUpdateMutation.isPending}
            refreshError={refreshStateMutation.error}
            refreshSucceeded={refreshStateMutation.isSuccess}
            updateError={repositoryUpdateMutation.error}
            updateResult={repositoryUpdateMutation.data ?? null}
            onRefresh={() => refreshStateMutation.mutate()}
            onUpdate={() => repositoryUpdateMutation.mutate()}
          />
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
          <p className="break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
            {repository.owner}
          </p>
          <h1 className="mt-1 break-words text-3xl font-semibold leading-tight text-foreground [overflow-wrap:anywhere]">
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

function ProjectWorkflowRecommendation({
  accessToken,
  currentUpdate,
  isLoading,
  latestScan,
  projectSummary,
  repositoryId
}: {
  accessToken: string;
  currentUpdate: RepositoryUpdateSummary | null;
  isLoading: boolean;
  latestScan: ScanSnapshot | null;
  projectSummary: DashboardProjectSummary | null;
  repositoryId: string;
}) {
  const analysisHref = projectSummary?.latestAnalysis
    ? `/analyses/${encodeURIComponent(projectSummary.latestAnalysis.analysisId)}`
    : null;
  const updateIsActive = currentUpdate?.status === "PENDING" || currentUpdate?.status === "RUNNING";
  const updateFailed =
    currentUpdate?.status === "FAILED" ||
    projectSummary?.state?.freshnessStatus === "UPDATE_FAILED";
  const scanIsActive = latestScan?.status === "PENDING" || latestScan?.status === "RUNNING";
  const scanIsComplete = latestScan?.status === "COMPLETED";

  let title = "Loading next step";
  let description = "Checking the current project workflow state.";
  let action: ReactNode = null;
  let secondaryAction: ReactNode = null;

  if (!isLoading && updateIsActive) {
    title = "Updating Project Context";
    description = projectSummary?.latestContext
      ? "Ctxaro is processing repository changes. Your current Project Context remains available while the update completes."
      : "Ctxaro is processing repository changes. You can leave this page and return later.";
  } else if (!isLoading && updateFailed) {
    title = "Project update needs attention";
    description = projectSummary?.latestContext
      ? "The latest update did not complete. Your previous Project Context remains available."
      : "The latest update did not complete. Review the existing recovery options before continuing.";
    action = (
      <Button asChild>
        <Link to="#project-state">Review recovery options</Link>
      </Button>
    );
  } else if (!isLoading && scanIsActive) {
    title = "Scanning repository";
    description =
      "Ctxaro is capturing the project for analysis. You can leave this page and return later.";
  } else if (!isLoading && !scanIsComplete) {
    title = "Start with a repository scan";
    description = "Capture the repository so Ctxaro can understand its structure and dependencies.";
    action = <RepositoryScanAction accessToken={accessToken} repositoryId={repositoryId} />;
  } else if (!isLoading && !projectSummary?.latestAnalysis && latestScan) {
    title = "Understand this project";
    description =
      "The repository snapshot is ready. Analyze it to build structured project understanding.";
    action = (
      <StartAnalysisButton
        accessToken={accessToken}
        label="Analyze project"
        pendingLabel="Understanding project"
        scanId={latestScan.id}
      />
    );
  } else if (!isLoading && analysisHref && !projectSummary?.latestContext) {
    title = "Generate Project Context";
    description =
      "Analysis is complete. Turn the project understanding into reusable Project Context.";
    action = (
      <Button asChild>
        <Link to={`${analysisHref}#project-context`}>Generate Project Context</Link>
      </Button>
    );
  } else if (!isLoading && analysisHref && projectSummary?.latestContext) {
    title = "Ready to use with AI";
    description = "The Project Context is ready to package for your AI tools.";
    action = (
      <Button asChild>
        <Link to={`${analysisHref}#ai-export`}>Open AI Export</Link>
      </Button>
    );
    secondaryAction = (
      <Button asChild variant="outline">
        <Link to={`${analysisHref}#documents`}>Generate documents</Link>
      </Button>
    );
  }

  return (
    <Card aria-label="Project next step" emphasis="primary">
      <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase text-primary">Next step</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">{title}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {action || secondaryAction ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            {action ? <div data-workflow-primary="true">{action}</div> : null}
            {secondaryAction}
          </div>
        ) : null}
      </CardContent>
    </Card>
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

function RepositoryUpdatesPanel({
  currentUpdate,
  history,
  isError,
  isLoading
}: {
  currentUpdate: RepositoryUpdateSummary | null;
  history: RepositoryUpdateSummary[];
  isError: boolean;
  isLoading: boolean;
}) {
  return (
    <Card id="updates" className="scroll-mt-40">
      <CardHeader>
        <CardTitle>Updates</CardTitle>
        <CardDescription>
          Manual repository update status and recent update attempts.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="rounded-md border bg-surface/60 p-3">
          <p className="text-sm font-medium text-foreground">Current update</p>
          {isLoading ? (
            <p className="mt-1 text-xs text-muted-foreground">Loading update status.</p>
          ) : currentUpdate ? (
            <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Badge tone="warning">{repositoryUpdateStatusLabel(currentUpdate.status)}</Badge>
                <span title={currentUpdate.targetCommitSha}>
                  Target {shortCommit(currentUpdate.targetCommitSha)}
                </span>
              </span>
              <span>
                {currentUpdate.startedAt
                  ? `Started ${displayDate(currentUpdate.startedAt)}`
                  : `Created ${displayDate(currentUpdate.createdAt)}`}
              </span>
            </div>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">No update in progress.</p>
          )}
        </div>

        {isError ? (
          <StatePanel
            className="p-3"
            description="Repository update history could not be loaded."
            title="Updates unavailable"
            tone="error"
          />
        ) : null}

        {!isLoading && !isError && history.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            No repository updates yet.
          </p>
        ) : null}

        {!isError && history.length > 0 ? (
          <ol className="grid gap-2">
            {history.map((update) => (
              <li key={update.id} className="rounded-md border bg-card/70 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={repositoryUpdateStatusTone(update.status)}>
                      {repositoryUpdateStatusLabel(update.status)}
                    </Badge>
                    <span className="text-xs uppercase text-muted-foreground">
                      {update.triggerType.toLowerCase()}
                    </span>
                  </div>
                  <span
                    className="font-mono text-xs text-subtle-foreground"
                    title={update.targetCommitSha}
                  >
                    {shortCommit(update.targetCommitSha)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {repositoryUpdateTimestamp(update)}
                </p>
                {update.status === "FAILED" ? (
                  <p className="mt-1 text-xs text-destructive">
                    Update did not complete. Any previously valid Project Context was not replaced.
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        ) : null}
      </CardContent>
    </Card>
  );
}

function repositoryUpdateStatusLabel(status: RepositoryUpdateSummary["status"]): string {
  return status.toLowerCase().replace(/^\w/, (char) => char.toUpperCase());
}

function repositoryUpdateStatusTone(
  status: RepositoryUpdateSummary["status"]
): "success" | "warning" | "error" | "muted" {
  if (status === "COMPLETED") {
    return "success";
  }

  if (status === "FAILED") {
    return "error";
  }

  if (status === "RUNNING" || status === "PENDING") {
    return "warning";
  }

  return "muted";
}

function repositoryUpdateTimestamp(update: RepositoryUpdateSummary): string {
  if (update.completedAt) {
    return `Completed ${displayDate(update.completedAt)}`;
  }

  if (update.failedAt) {
    return `Failed ${displayDate(update.failedAt)}`;
  }

  if (update.startedAt) {
    return `Started ${displayDate(update.startedAt)}`;
  }

  return `Created ${displayDate(update.createdAt)}`;
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
  isError,
  isLoading,
  projectSummary,
  repositoryId
}: {
  isError: boolean;
  isLoading: boolean;
  projectSummary: DashboardProjectSummary | null;
  repositoryId: string;
}) {
  const analysisHref = projectSummary?.latestAnalysis
    ? `/analyses/${encodeURIComponent(projectSummary.latestAnalysis.analysisId)}`
    : null;
  const contextHref = analysisHref ? `${analysisHref}#project-context` : null;
  const documentsHref = analysisHref ? `${analysisHref}#documents` : null;
  const aiExportHref = analysisHref ? `${analysisHref}#ai-export` : null;
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
              href={contextHref}
              actionLabel={projectSummary?.latestContext ? "Open Context" : "Open Context workflow"}
            />
            <WorkflowRow
              available={Boolean(projectSummary?.documents.available)}
              icon={FileText}
              label="Documents"
              value={`${projectSummary?.documents.count ?? 0} generated`}
              href={projectSummary?.latestContext ? documentsHref : null}
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
              href={projectSummary?.latestContext ? aiExportHref : null}
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
  isRefreshing,
  isUpdating,
  latestScan,
  onRefresh,
  onUpdate,
  projectSummary,
  refreshError,
  refreshSucceeded,
  updateError,
  updateResult,
  repository
}: {
  isRefreshing: boolean;
  isUpdating: boolean;
  latestScan: ScanSnapshot | null;
  onRefresh: () => void;
  onUpdate: () => void;
  projectSummary: DashboardProjectSummary | null;
  refreshError: unknown;
  refreshSucceeded: boolean;
  updateError: unknown;
  updateResult: RepositoryUpdateResponse | null;
  repository: RepositorySummary;
}) {
  const repositoryState = projectSummary?.state ?? null;

  return (
    <Card id="project-state" className="scroll-mt-40">
      <CardHeader>
        <CardTitle>Current state</CardTitle>
        <CardDescription>Based on stored repository state and scan history.</CardDescription>
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
          <TechnicalText
            className="text-right text-subtle-foreground"
            title={repository.defaultBranch}
          >
            {repository.defaultBranch}
          </TechnicalText>
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
        <StateRow label="Freshness" value={freshnessLabel(repositoryState)} />
        <StateRow
          label="Remote HEAD"
          title={repositoryState?.remoteHeadCommitSha ?? undefined}
          value={
            repositoryState?.remoteHeadCommitSha
              ? shortCommit(repositoryState.remoteHeadCommitSha)
              : "Not available"
          }
        />
        <StateRow
          label="Current context"
          title={repositoryState?.currentContextCommitSha ?? undefined}
          value={
            repositoryState?.currentContextCommitSha
              ? shortCommit(repositoryState.currentContextCommitSha)
              : "Not available"
          }
        />
        <StateRow
          label="Last scanned commit"
          title={repositoryState?.lastScannedCommitSha ?? undefined}
          value={
            repositoryState?.lastScannedCommitSha
              ? shortCommit(repositoryState.lastScannedCommitSha)
              : "Not available"
          }
        />
        <StateRow
          label="Last analyzed commit"
          title={repositoryState?.lastAnalyzedCommitSha ?? undefined}
          value={
            repositoryState?.lastAnalyzedCommitSha
              ? shortCommit(repositoryState.lastAnalyzedCommitSha)
              : "Not available"
          }
        />
        <div className="grid gap-2 border-t border-border/70 pt-3">
          <Button
            type="button"
            variant="outline"
            disabled={isRefreshing || isUpdating}
            aria-busy={isRefreshing}
            onClick={onRefresh}
          >
            <RefreshCw className={isRefreshing ? "animate-spin" : undefined} />
            {isRefreshing ? "Refreshing" : "Refresh freshness"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isUpdating || isRefreshing}
            aria-busy={isUpdating}
            onClick={onUpdate}
          >
            <RefreshCw className={isUpdating ? "animate-spin" : undefined} />
            {isUpdating ? "Updating" : "Update repository"}
          </Button>
          <div aria-live="polite">
            {refreshSucceeded ? (
              <p className="text-xs text-primary">Repository freshness refreshed.</p>
            ) : null}
            {updateResult ? (
              <p className="text-xs text-primary">
                {updateResult.noop
                  ? "Repository context is already current."
                  : "Repository context updated."}
              </p>
            ) : null}
            {refreshError ? <ErrorNotice error={userFacingError(refreshError)} /> : null}
            {updateError ? (
              <ErrorNotice error={userFacingError(updateError, "repositoryUpdate")} />
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StateRow({
  label,
  title,
  value
}: {
  label: string;
  title?: string | undefined;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span
        className="truncate text-right font-mono text-xs text-subtle-foreground"
        title={title ?? value}
      >
        {value}
      </span>
    </div>
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
            <dd className="mt-1">
              <TechnicalText as="code" className="block text-subtle-foreground" title={value}>
                {value}
              </TechnicalText>
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
