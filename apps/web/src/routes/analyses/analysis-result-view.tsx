import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { PageHeading } from "@/components/typography/page-heading";
import { Button } from "@/components/ui/button";
import { AnalysisApiRequestError, getAnalysisResult } from "@/features/analysis/api/analysis-api";
import { AnalysisResultDetails } from "@/features/analysis/components/analysis-result-details";
import { getGitHubLoginUrl } from "@/features/auth/api/auth-api";
import { useAuthSessionStore } from "@/features/auth/stores/auth-session-store";
import { ProjectContextPanel } from "@/features/context/components/project-context-panel";

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

export function AnalysisResultView() {
  const { analysisId } = useParams<{ analysisId: string }>();
  const apiAccessToken = useAuthSessionStore((state) => state.accessToken);
  const analysisQuery = useQuery({
    queryKey: ["analysis", analysisId],
    queryFn: () => getAnalysisResult(apiAccessToken, analysisId ?? ""),
    enabled: Boolean(apiAccessToken && analysisId)
  });

  return (
    <>
      <PageHeading
        eyebrow="Analysis"
        title="Analysis result"
        description="Backend-generated project analysis from a completed scan."
        actions={
          analysisQuery.data ? (
            <Button asChild variant="outline">
              <Link to={`/repositories/${encodeURIComponent(analysisQuery.data.repositoryId)}`}>
                Repository
              </Link>
            </Button>
          ) : null
        }
      />

      {!apiAccessToken ? (
        <AnalysisState
          title="Session required"
          description="Sign in with GitHub to load analysis results."
          action={
            <Button asChild>
              <a href={getGitHubLoginUrl()}>Sign in with GitHub</a>
            </Button>
          }
        />
      ) : null}

      {apiAccessToken && analysisQuery.isLoading ? (
        <AnalysisState title="Loading analysis" description="Fetching persisted analysis result." />
      ) : null}

      {apiAccessToken && analysisQuery.isError ? (
        <AnalysisState
          title="Analysis unavailable"
          description={analysisErrorMessage(analysisQuery.error)}
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
        />
      ) : null}

      {analysisQuery.data ? (
        <div className="grid gap-6">
          <ProjectContextPanel
            accessToken={apiAccessToken}
            analysisId={analysisQuery.data.analysisId}
          />
          <AnalysisResultDetails result={analysisQuery.data} />
        </div>
      ) : null}
    </>
  );
}

function AnalysisState({
  action,
  description,
  title
}: {
  action?: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="rounded-md border bg-card/70 p-6">
      <h2 className="text-sm font-medium">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </section>
  );
}
