import { useMemo } from "react";
import { matchPath, type Location } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { getAnalysisResult } from "@/features/analysis/api/analysis-api";
import { useAuthSessionStore } from "@/features/auth/stores/auth-session-store";
import {
  getRepository,
  type RepositorySummary
} from "@/features/repositories/api/repositories-api";

export type ShellBreadcrumb = {
  href?: string;
  label: string;
};

export type ShellContext = {
  analysisId: string | null;
  breadcrumbs: ShellBreadcrumb[];
  currentRepository: RepositorySummary | null;
  isProjectLoading: boolean;
  projectHref: string | null;
  repositoryId: string | null;
  section: string;
};

function compactRepositoryName(fullName: string): { name: string; owner: string | null } {
  const [owner, name] = fullName.split("/");

  if (owner && name) {
    return { name, owner };
  }

  return { name: fullName, owner: null };
}

export function repositoryDisplayName(repository: RepositorySummary): string {
  return compactRepositoryName(repository.fullName).name;
}

export function repositoryOwner(repository: RepositorySummary): string | null {
  return compactRepositoryName(repository.fullName).owner ?? repository.owner;
}

export function useShellContext(location: Location): ShellContext {
  const accessToken = useAuthSessionStore((state) => state.accessToken);
  const pathname = location.pathname;
  const repositoryMatch = matchPath({ path: "/repositories/:id", end: true }, pathname);
  const analysisMatch = matchPath({ path: "/analyses/:analysisId", end: true }, pathname);
  const repositoryIdFromRoute = repositoryMatch?.params.id ?? null;
  const analysisId = analysisMatch?.params.analysisId ?? null;
  const analysisQuery = useQuery({
    queryKey: ["analysis", analysisId],
    queryFn: () => getAnalysisResult(accessToken, analysisId ?? ""),
    enabled: Boolean(accessToken && analysisId)
  });
  const repositoryId = repositoryIdFromRoute ?? analysisQuery.data?.repositoryId ?? null;
  const repositoryQuery = useQuery({
    queryKey: ["repositories", repositoryId],
    queryFn: () => getRepository(accessToken, repositoryId ?? ""),
    enabled: Boolean(accessToken && repositoryId)
  });
  const currentRepository = repositoryQuery.data ?? null;
  const projectHref = repositoryId ? `/repositories/${encodeURIComponent(repositoryId)}` : null;

  return useMemo(() => {
    if (pathname === "/") {
      return {
        analysisId,
        breadcrumbs: [{ label: "Dashboard" }],
        currentRepository,
        isProjectLoading: repositoryQuery.isLoading || analysisQuery.isLoading,
        projectHref,
        repositoryId,
        section: "Dashboard"
      };
    }

    if (pathname === "/repositories") {
      return {
        analysisId,
        breadcrumbs: [{ label: "Projects" }],
        currentRepository,
        isProjectLoading: repositoryQuery.isLoading || analysisQuery.isLoading,
        projectHref,
        repositoryId,
        section: "Projects"
      };
    }

    if (pathname === "/repositories/connect") {
      return {
        analysisId,
        breadcrumbs: [{ href: "/repositories", label: "Projects" }, { label: "Connect" }],
        currentRepository,
        isProjectLoading: repositoryQuery.isLoading || analysisQuery.isLoading,
        projectHref,
        repositoryId,
        section: "Connect Repository"
      };
    }

    if (repositoryIdFromRoute) {
      const label = currentRepository ? repositoryDisplayName(currentRepository) : "Repository";

      return {
        analysisId,
        breadcrumbs: [{ href: "/repositories", label: "Projects" }, { label }],
        currentRepository,
        isProjectLoading: repositoryQuery.isLoading || analysisQuery.isLoading,
        projectHref,
        repositoryId,
        section: "Repository"
      };
    }

    if (analysisId) {
      const projectLabel = currentRepository ? repositoryDisplayName(currentRepository) : "Project";

      return {
        analysisId,
        breadcrumbs: [
          { href: "/repositories", label: "Projects" },
          ...(projectHref ? [{ href: projectHref, label: projectLabel }] : []),
          { label: "Analysis" }
        ],
        currentRepository,
        isProjectLoading: repositoryQuery.isLoading || analysisQuery.isLoading,
        projectHref,
        repositoryId,
        section: "Analysis"
      };
    }

    if (pathname === "/auth/callback") {
      return {
        analysisId,
        breadcrumbs: [{ label: "Signing in" }],
        currentRepository,
        isProjectLoading: repositoryQuery.isLoading || analysisQuery.isLoading,
        projectHref,
        repositoryId,
        section: "Signing in"
      };
    }

    return {
      analysisId,
      breadcrumbs: [{ label: "Workspace" }],
      currentRepository,
      isProjectLoading: repositoryQuery.isLoading || analysisQuery.isLoading,
      projectHref,
      repositoryId,
      section: "Workspace"
    };
  }, [
    analysisId,
    analysisQuery.isLoading,
    currentRepository,
    pathname,
    projectHref,
    repositoryId,
    repositoryIdFromRoute,
    repositoryQuery.isLoading
  ]);
}
