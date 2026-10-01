import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";

import { useAuthSessionStore } from "@/features/auth/stores/auth-session-store";
import { listDashboardProjects } from "@/features/dashboard/api/dashboard-api";
import {
  getCurrentRepositoryUpdate,
  getRepositoryState
} from "@/features/repositories/api/repositories-api";
import { ProjectContextStatus } from "@/features/repositories/components/project-context-status";
import type { ShellContext } from "@/layouts/shell-context";
import { repositoryDisplayName, repositoryOwner } from "@/layouts/shell-context";
import { activeProjectSection, type ProjectSection } from "@/layouts/project-navigation-state";
import { cn } from "@/lib/utils";

const sections: { key: ProjectSection; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "timeline", label: "Timeline" },
  { key: "context", label: "Context" },
  { key: "architecture-history", label: "Architecture History" },
  { key: "updates", label: "Updates" },
  { key: "documents", label: "Documents" },
  { key: "decisions", label: "Decisions" },
  { key: "settings", label: "Settings" }
];

export function ProjectNavigation({ shellContext }: { shellContext: ShellContext }) {
  const location = useLocation();
  const accessToken = useAuthSessionStore((state) => state.accessToken);
  const repository = shellContext.currentRepository;
  const dashboardQuery = useQuery({
    queryKey: ["dashboard", "projects"],
    queryFn: () => listDashboardProjects(accessToken),
    enabled: Boolean(accessToken && shellContext.repositoryId)
  });
  const stateQuery = useQuery({
    queryKey: ["repositories", shellContext.repositoryId, "state"],
    queryFn: () => getRepositoryState(accessToken, shellContext.repositoryId ?? ""),
    enabled: Boolean(accessToken && shellContext.repositoryId)
  });
  const currentUpdateQuery = useQuery({
    queryKey: ["repositories", shellContext.repositoryId, "updates", "current"],
    queryFn: () => getCurrentRepositoryUpdate(accessToken, shellContext.repositoryId ?? ""),
    enabled: Boolean(accessToken && shellContext.repositoryId)
  });

  if (!repository || !shellContext.projectHref) return null;

  const project = dashboardQuery.data?.projects.find(
    (item) => item.repository.id === shellContext.repositoryId
  );
  const analysisId = shellContext.analysisId ?? project?.latestAnalysis?.analysisId ?? null;
  const analysisHref = analysisId ? `/analyses/${encodeURIComponent(analysisId)}` : null;
  const hrefs: Record<ProjectSection, string | null> = {
    overview: `${shellContext.projectHref}#overview`,
    timeline: `${shellContext.projectHref}/timeline`,
    context: analysisHref ? `${analysisHref}#project-context` : null,
    "architecture-history": `${shellContext.projectHref}/architecture-history`,
    updates: `${shellContext.projectHref}#updates`,
    documents: analysisHref ? `${analysisHref}#documents` : null,
    decisions: `${shellContext.projectHref}/decisions`,
    settings: null
  };
  const activeSection = activeProjectSection(location.pathname, location.hash);

  return (
    <section
      className="rounded-md border border-border bg-card/70 px-4 pt-4 shadow-[var(--shadow-control)] md:px-5 md:pt-5"
      aria-label="Current project"
    >
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold text-foreground">
          {repositoryDisplayName(repository)}
        </p>
        <p className="truncate text-sm text-muted-foreground">{repositoryOwner(repository)}</p>
      </div>
      <ProjectContextStatus
        contextGeneratedAt={project?.latestContext?.generatedAt ?? null}
        currentUpdate={currentUpdateQuery.data?.update ?? null}
        isLoading={stateQuery.isLoading || currentUpdateQuery.isLoading}
        projectStateHref={`${shellContext.projectHref}#project-state`}
        state={stateQuery.data ?? null}
        updatesHref={`${shellContext.projectHref}#updates`}
      />
      <nav className="mt-4 overflow-x-auto" aria-label="Project sections">
        <ul className="flex min-w-max gap-1">
          {sections.map((section) => {
            const href = hrefs[section.key];
            const isActive = activeSection === section.key;
            const className = cn(
              "relative inline-flex h-10 items-center rounded-t-md px-3 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70",
              isActive &&
                "bg-accent text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary"
            );

            return (
              <li key={section.key}>
                {href ? (
                  <Link
                    className={className}
                    to={href}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {section.label}
                  </Link>
                ) : (
                  <span
                    className={cn(className, "cursor-not-allowed opacity-45")}
                    aria-disabled="true"
                  >
                    {section.label}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </section>
  );
}
