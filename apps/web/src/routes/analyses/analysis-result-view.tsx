import {
  ArrowLeft,
  Bot,
  Braces,
  CalendarClock,
  FileText,
  GitBranch,
  Layers3,
  Radar,
  RefreshCw
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { StatePanel } from "@/components/shared/state-panel";
import { StatusDot } from "@/components/shared/status-dot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AnalysisApiRequestError, getAnalysisResult } from "@/features/analysis/api/analysis-api";
import {
  AnalysisWorkflowNav,
  type AnalysisWorkflowStep,
  type NextStepRecommendation
} from "@/features/analysis/components/analysis-workflow-nav";
import { AnalysisResultDetails } from "@/features/analysis/components/analysis-result-details";
import { getGitHubLoginUrl } from "@/features/auth/api/auth-api";
import { useAuthSessionStore } from "@/features/auth/stores/auth-session-store";
import {
  ContextApiRequestError,
  generateProjectContext,
  getLatestProjectContext
} from "@/features/context/api/context-api";
import { ProjectContextPanel } from "@/features/context/components/project-context-panel";
import { getDocumentHistory } from "@/features/documents/api/document-api";
import { getRepository } from "@/features/repositories/api/repositories-api";
import type { AnalysisResultResponse, RepositorySummary } from "@ai-context/contracts";

function analysisErrorMessage(error: unknown): string {
  if (error instanceof AnalysisApiRequestError) {
    if (error.status === 401) {
      return "Sign in again to load this analysis.";
    }

    if (error.status === 403) {
      return "You do not have access to this analysis.";
    }

    if (error.status === 404) {
      return "This analysis was not found.";
    }

    return "Analysis result could not be loaded.";
  }

  return "Network problem. Check your connection and try again.";
}

function displayDate(value: string): string {
  return new Date(value).toLocaleString();
}

function projectName(repository: RepositorySummary | undefined): string {
  if (!repository) {
    return "Project analysis";
  }

  return repository.name || repository.fullName.split("/")[1] || repository.fullName;
}

export function AnalysisResultView() {
  const { analysisId } = useParams<{ analysisId: string }>();
  const apiAccessToken = useAuthSessionStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const analysisQuery = useQuery({
    queryKey: ["analysis", analysisId],
    queryFn: () => getAnalysisResult(apiAccessToken, analysisId ?? ""),
    enabled: Boolean(apiAccessToken && analysisId)
  });
  const repositoryQuery = useQuery({
    queryKey: ["repositories", analysisQuery.data?.repositoryId],
    queryFn: () => getRepository(apiAccessToken, analysisQuery.data?.repositoryId ?? ""),
    enabled: Boolean(apiAccessToken && analysisQuery.data?.repositoryId)
  });
  const latestContextQuery = useQuery({
    queryKey: ["context", "latest", analysisQuery.data?.analysisId],
    queryFn: () => getLatestProjectContext(apiAccessToken, analysisQuery.data?.analysisId ?? ""),
    enabled: Boolean(apiAccessToken && analysisQuery.data?.analysisId)
  });
  const activeContext = latestContextQuery.data;
  const documentHistoryQuery = useQuery({
    queryKey: ["document-history", activeContext?.id],
    queryFn: () => getDocumentHistory(apiAccessToken, activeContext?.id ?? ""),
    enabled: Boolean(apiAccessToken && activeContext?.id)
  });
  const generateContextMutation = useMutation({
    mutationFn: () => generateProjectContext(apiAccessToken, analysisQuery.data?.analysisId ?? ""),
    onSuccess: async (context) => {
      queryClient.setQueryData(["context", context.id], context);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard", "projects"] }),
        queryClient.invalidateQueries({ queryKey: ["context", "latest", context.analysisId] }),
        queryClient.invalidateQueries({ queryKey: ["context-history", context.analysisId] })
      ]);
    }
  });

  if (!apiAccessToken) {
    return (
      <StatePanel
        action={
          <Button asChild>
            <a href={getGitHubLoginUrl()}>Sign in with GitHub</a>
          </Button>
        }
        className="min-h-[320px]"
        description="Sign in with GitHub to load project intelligence."
        title="Session required"
        tone="empty"
      />
    );
  }

  if (analysisQuery.isLoading) {
    return (
      <StatePanel
        className="min-h-[320px]"
        description="Loading the project analysis generated from a completed scan."
        title="Loading project analysis"
        tone="loading"
      />
    );
  }

  if (analysisQuery.isError) {
    return (
      <StatePanel
        action={
          <Button
            type="button"
            variant="outline"
            disabled={analysisQuery.isFetching}
            onClick={() => void analysisQuery.refetch()}
          >
            <RefreshCw />
            Retry
          </Button>
        }
        className="min-h-[320px]"
        description={analysisErrorMessage(analysisQuery.error)}
        title="Analysis unavailable"
        tone="error"
      />
    );
  }

  if (!analysisQuery.data) {
    return (
      <StatePanel
        className="min-h-[320px]"
        description="No analysis data was returned for this result."
        title="Analysis not found"
        tone="empty"
      />
    );
  }

  return (
    <div className="grid gap-5">
      <AnalysisHeader
        analysis={analysisQuery.data}
        isRepositoryLoading={repositoryQuery.isLoading}
        repository={repositoryQuery.data}
      />
      <AnalysisWorkflowNav
        nextStep={buildNextStepRecommendation({
          canGenerateContext: Boolean(analysisQuery.data.analysisId),
          contextError: latestContextQuery.error,
          documentCount: documentHistoryQuery.data?.documents.length ?? 0,
          documentError: documentHistoryQuery.error,
          hasContext: Boolean(activeContext),
          isContextGenerating: generateContextMutation.isPending,
          isContextLoading: latestContextQuery.isLoading,
          isDocumentLoading: documentHistoryQuery.isLoading,
          onGenerateContext: () => generateContextMutation.mutate()
        })}
        steps={buildWorkflowSteps({
          analysis: analysisQuery.data,
          contextError: latestContextQuery.error,
          documentCount: documentHistoryQuery.data?.documents.length ?? 0,
          documentError: documentHistoryQuery.error,
          hasContext: Boolean(activeContext),
          isContextGenerating: generateContextMutation.isPending,
          isContextLoading: latestContextQuery.isLoading,
          isDocumentLoading: documentHistoryQuery.isLoading
        })}
      />
      <div id="analysis" className="scroll-mt-48">
        <AnalysisResultDetails result={analysisQuery.data} />
      </div>
      <ProjectContextPanel
        accessToken={apiAccessToken}
        analysisId={analysisQuery.data.analysisId}
      />
    </div>
  );
}

function isNotFoundContextError(error: unknown): boolean {
  return error instanceof ContextApiRequestError && error.status === 404;
}

function isBlockingError(error: unknown): boolean {
  return Boolean(error) && !isNotFoundContextError(error);
}

function buildWorkflowSteps({
  analysis,
  contextError,
  documentCount,
  documentError,
  hasContext,
  isContextGenerating,
  isContextLoading,
  isDocumentLoading
}: {
  analysis: AnalysisResultResponse;
  contextError: unknown;
  documentCount: number;
  documentError: unknown;
  hasContext: boolean;
  isContextGenerating: boolean;
  isContextLoading: boolean;
  isDocumentLoading: boolean;
}): AnalysisWorkflowStep[] {
  const contextBlocked = isBlockingError(contextError);
  const documentsBlocked = isBlockingError(documentError);

  const documentStep: AnalysisWorkflowStep = {
    description: documentCount > 0 ? "Documents available" : "Generate overview",
    icon: FileText,
    key: "documents",
    label: "Documents",
    status: documentsBlocked
      ? "failed"
      : isDocumentLoading
        ? "running"
        : documentCount > 0
          ? "available"
          : hasContext
            ? "actionable"
            : "unavailable"
  };
  const aiExportStep: AnalysisWorkflowStep = {
    description: hasContext ? "Export ready" : "Requires Context",
    icon: Bot,
    key: "ai-export",
    label: "AI Export",
    status: hasContext ? "available" : "unavailable"
  };

  if (hasContext) {
    documentStep.href = "#documents";
    aiExportStep.href = "#ai-export";
  }

  return [
    {
      description: "Repository connected",
      href: `/repositories/${encodeURIComponent(analysis.repositoryId)}`,
      icon: GitBranch,
      key: "repository",
      label: "Repository",
      status: "completed"
    },
    {
      description: "Scan source ready",
      icon: Radar,
      key: "scan",
      label: "Scan",
      status: "completed"
    },
    {
      description: "Viewing results",
      href: "#analysis",
      icon: Braces,
      key: "analysis",
      label: "Analysis",
      status: "current"
    },
    {
      description: hasContext ? "Context available" : "Generate from analysis",
      href: "#project-context",
      icon: Braces,
      key: "project-context",
      label: "Project Context",
      status: contextBlocked
        ? "failed"
        : isContextGenerating || isContextLoading
          ? "running"
          : hasContext
            ? "available"
            : "actionable"
    },
    documentStep,
    aiExportStep
  ];
}

function buildNextStepRecommendation({
  canGenerateContext,
  contextError,
  documentCount,
  documentError,
  hasContext,
  isContextGenerating,
  isContextLoading,
  isDocumentLoading,
  onGenerateContext
}: {
  canGenerateContext: boolean;
  contextError: unknown;
  documentCount: number;
  documentError: unknown;
  hasContext: boolean;
  isContextGenerating: boolean;
  isContextLoading: boolean;
  isDocumentLoading: boolean;
  onGenerateContext: () => void;
}): NextStepRecommendation {
  if (isBlockingError(contextError)) {
    return {
      action: { href: "#project-context", label: "Review Context" },
      description:
        "Ctxaro could not load Project Context state. Review the section below and retry there.",
      eyebrow: "Next step",
      title: "Check Project Context"
    };
  }

  if (!hasContext) {
    return {
      action: {
        busy: isContextGenerating,
        disabled: !canGenerateContext || isContextLoading || isContextGenerating,
        label: isContextGenerating ? "Generating Context" : "Generate Project Context",
        onClick: onGenerateContext
      },
      description:
        "Analysis is complete. Generate structured Project Context so Documents and AI Export can use this repository knowledge.",
      eyebrow: "Next step",
      title: "Generate Project Context"
    };
  }

  if (isBlockingError(documentError)) {
    return {
      action: { href: "#documents", label: "Review Documents" },
      description:
        "Ctxaro could not load document state for this Context. Review the section below.",
      eyebrow: "Next step",
      title: "Check document generation"
    };
  }

  if (documentCount === 0) {
    return {
      action: {
        disabled: isDocumentLoading,
        href: "#documents",
        label: isDocumentLoading ? "Loading Documents" : "Generate Project Overview"
      },
      description:
        "Project Context is ready. Move to Documents and generate the first readable Markdown overview.",
      eyebrow: "Next step",
      title: "Generate Project Overview"
    };
  }

  return {
    action: { href: "#ai-export", label: "Open AI Export" },
    description:
      "Context and documentation are available. Package the selected Project Context for AI tools.",
    eyebrow: "Workflow ready",
    title: "Export your project context"
  };
}

function AnalysisHeader({
  analysis,
  isRepositoryLoading,
  repository
}: {
  analysis: AnalysisResultResponse;
  isRepositoryLoading: boolean;
  repository: RepositorySummary | undefined;
}) {
  return (
    <header className="rounded-md border border-border bg-card/70 p-5 shadow-[var(--shadow-control)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone="success">Completed</Badge>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="size-3.5" />
              Generated {displayDate(analysis.generatedAt)}
            </span>
          </div>
          <p className="text-sm font-medium uppercase text-primary">Analysis</p>
          <h1 className="mt-1 truncate text-3xl font-semibold leading-tight text-foreground">
            {projectName(repository)}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
            Project intelligence generated from a completed repository scan.
          </p>
          {repository ? (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>{repository.owner}</span>
              <span className="inline-flex items-center gap-1.5">
                <GitBranch className="size-3.5" />
                {repository.defaultBranch}
              </span>
              <Badge tone={repository.visibility === "PRIVATE" ? "muted" : "success"}>
                {repository.visibility.toLowerCase()}
              </Badge>
            </div>
          ) : isRepositoryLoading ? (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <StatusDot active tone="running" />
              Loading project identity
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link to={`/repositories/${encodeURIComponent(analysis.repositoryId)}`}>
              <ArrowLeft />
              View project
            </Link>
          </Button>
        </div>
      </div>

      <Card className="mt-5" emphasis="flat">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
          <HeaderFact icon={Layers3} label="Analyzer" value={analysis.analyzerVersion} />
          <HeaderFact label="Files classified" value={String(analysis.files.length)} />
          <HeaderFact
            label="Source files parsed"
            value={String(analysis.sourceStructures.length)}
          />
        </CardContent>
      </Card>
    </header>
  );
}

function HeaderFact({
  icon: Icon,
  label,
  value
}: {
  icon?: typeof Layers3;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon ? <Icon className="size-3.5" /> : null}
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-medium text-foreground" title={value}>
        {value}
      </p>
    </div>
  );
}
