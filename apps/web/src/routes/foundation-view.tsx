import { ArrowRight, FileText, GitBranch, Layers3, Plus, RefreshCw, ScanLine } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { StatePanel } from "@/components/shared/state-panel";
import { PageHeading } from "@/components/typography/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getGitHubLoginUrl } from "@/features/auth/api/auth-api";
import { useAuthSessionStore } from "@/features/auth/stores/auth-session-store";
import { listRepositories } from "@/features/repositories/api/repositories-api";
import { RepositoryCard } from "@/features/repositories/components/repository-card";

const pipelineSteps = [
  { description: "Connect a GitHub project.", icon: GitBranch, label: "Repository" },
  { description: "Capture repository metadata and files.", icon: ScanLine, label: "Scan" },
  {
    description: "Detect structure, languages, and dependencies.",
    icon: Layers3,
    label: "Analysis"
  },
  { description: "Generate structured project intelligence.", icon: FileText, label: "Context" },
  {
    description: "Create documentation and AI-ready outputs.",
    icon: ArrowRight,
    label: "Documents"
  }
];

export function FoundationView() {
  const apiAccessToken = useAuthSessionStore((state) => state.accessToken);
  const repositoriesQuery = useQuery({
    queryKey: ["repositories"],
    queryFn: () => listRepositories(apiAccessToken),
    enabled: Boolean(apiAccessToken)
  });
  const repositories = repositoriesQuery.data?.repositories ?? [];

  return (
    <>
      <PageHeading
        eyebrow="Project Overview"
        title="Turn repositories into AI-ready context"
        description="Connect software repositories, scan their structure, analyze the codebase, generate project context, and produce documentation your AI tools can use."
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

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-4">
          <section className="grid gap-3" aria-labelledby="dashboard-projects-title">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="dashboard-projects-title" className="text-base font-semibold">
                  Projects
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Connected repositories available for scanning and analysis.
                </p>
              </div>
              {repositories.length > 0 ? (
                <Badge tone="success">{repositories.length} connected</Badge>
              ) : null}
            </div>

            {!apiAccessToken ? (
              <StatePanel
                action={
                  <Button asChild>
                    <a href={getGitHubLoginUrl()}>Continue with GitHub</a>
                  </Button>
                }
                className="min-h-[260px]"
                description="Sign in to connect repositories, scan codebases, and generate project context."
                title="Start with your GitHub workspace"
                tone="empty"
              />
            ) : null}

            {apiAccessToken && repositoriesQuery.isLoading ? (
              <StatePanel
                className="min-h-[220px]"
                description="Loading connected repositories for this workspace."
                title="Loading projects"
                tone="loading"
              />
            ) : null}

            {apiAccessToken && repositoriesQuery.isError ? (
              <StatePanel
                action={
                  <Button
                    type="button"
                    variant="outline"
                    disabled={repositoriesQuery.isFetching}
                    onClick={() => void repositoriesQuery.refetch()}
                  >
                    <RefreshCw />
                    Retry
                  </Button>
                }
                className="min-h-[220px]"
                description="The repository service could not load your connected projects."
                title="Projects unavailable"
                tone="error"
              />
            ) : null}

            {apiAccessToken && repositoriesQuery.isSuccess && repositories.length === 0 ? (
              <EmptyDashboardState />
            ) : null}

            {repositories.length > 0 ? (
              <div className="grid gap-3 xl:grid-cols-2">
                {repositories.map((repository) => (
                  <RepositoryCard
                    key={repository.id}
                    accessToken={apiAccessToken}
                    repository={repository}
                  />
                ))}
              </div>
            ) : null}
          </section>
        </div>

        <aside className="grid content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle>How the workspace works</CardTitle>
              <CardDescription>
                The product moves from a connected repository toward reusable AI context.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="grid gap-3">
                {pipelineSteps.map((step, index) => (
                  <li key={step.label} className="flex gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-md border bg-surface">
                      <step.icon className="size-4 text-primary" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{step.label}</span>
                        <span className="text-xs text-muted-foreground">{index + 1}</span>
                      </span>
                      <span className="mt-0.5 block text-sm leading-6 text-muted-foreground">
                        {step.description}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </aside>
      </section>
    </>
  );
}

function EmptyDashboardState() {
  return (
    <StatePanel
      action={
        <Button asChild>
          <Link to="/repositories/connect">
            <Plus />
            Connect repository
          </Link>
        </Button>
      }
      className="min-h-[300px]"
      description="Connecting a repository lets the platform scan its structure, run analysis, build project context, and generate documentation or AI-ready outputs from real codebase data."
      title="Connect your first repository"
      tone="empty"
    />
  );
}
