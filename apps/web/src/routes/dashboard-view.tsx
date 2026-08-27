import { GitBranch, Plus, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { StatePanel } from "@/components/shared/state-panel";
import { PageHeading } from "@/components/typography/page-heading";
import { Button } from "@/components/ui/button";
import { getGitHubLoginUrl } from "@/features/auth/api/auth-api";
import { useAuthSessionStore } from "@/features/auth/stores/auth-session-store";
import { listDashboardProjects } from "@/features/dashboard/api/dashboard-api";
import { ProjectSummaryCard } from "@/features/dashboard/components/project-summary-card";

export function DashboardView() {
  const apiAccessToken = useAuthSessionStore((state) => state.accessToken);
  const dashboardProjectsQuery = useQuery({
    queryKey: ["dashboard", "projects"],
    queryFn: () => listDashboardProjects(apiAccessToken),
    enabled: Boolean(apiAccessToken)
  });
  const projects = dashboardProjectsQuery.data?.projects ?? [];

  return (
    <>
      <PageHeading
        eyebrow="Dashboard"
        title="Project dashboard"
        description="A central view for connected projects and their verified processing state."
        actions={
          apiAccessToken ? (
            <Button asChild>
              <Link to="/repositories/connect">
                <Plus />
                Connect repository
              </Link>
            </Button>
          ) : (
            <Button asChild>
              <a href={getGitHubLoginUrl()}>Continue with GitHub</a>
            </Button>
          )
        }
      />

      {!apiAccessToken ? (
        <StatePanel
          action={
            <Button asChild>
              <a href={getGitHubLoginUrl()}>Continue with GitHub</a>
            </Button>
          }
          className="min-h-[260px]"
          description="Sign in to load connected projects and dashboard summaries."
          title="Session required"
          tone="empty"
        />
      ) : null}

      {apiAccessToken && dashboardProjectsQuery.isLoading ? (
        <StatePanel
          className="min-h-[240px]"
          description="Loading project summaries from the dashboard read model."
          title="Loading dashboard"
          tone="loading"
        />
      ) : null}

      {apiAccessToken && dashboardProjectsQuery.isError ? (
        <StatePanel
          action={
            <Button
              type="button"
              variant="outline"
              disabled={dashboardProjectsQuery.isFetching}
              onClick={() => void dashboardProjectsQuery.refetch()}
            >
              <RefreshCw />
              Retry
            </Button>
          }
          className="min-h-[240px]"
          description="Dashboard project summaries could not be loaded."
          title="Dashboard unavailable"
          tone="error"
        />
      ) : null}

      {apiAccessToken && dashboardProjectsQuery.isSuccess && projects.length === 0 ? (
        <StatePanel
          action={
            <Button asChild>
              <Link to="/repositories/connect">
                <GitBranch />
                Connect repository
              </Link>
            </Button>
          }
          className="min-h-[300px]"
          description="Connect a GitHub repository to start building project context."
          title="No connected projects"
          tone="empty"
        />
      ) : null}

      {apiAccessToken && dashboardProjectsQuery.isSuccess && projects.length > 0 ? (
        <section className="grid gap-3" aria-labelledby="dashboard-projects-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="dashboard-projects-title" className="text-base font-semibold">
                Projects overview
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {projects.length} connected project{projects.length === 1 ? "" : "s"} shown.
              </p>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {projects.map((project) => (
              <ProjectSummaryCard key={project.repository.id} project={project} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
