import { ExternalLink, GitFork, RefreshCw, Star } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PageHeading } from "@/components/typography/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getGitHubLoginUrl } from "@/features/auth/api/auth-api";
import { useAuthSessionStore } from "@/features/auth/stores/auth-session-store";
import {
  RepositoryErrorState,
  RepositoryState
} from "@/features/repositories/components/repository-state";
import { getRepository, syncRepository } from "@/features/repositories/api/repositories-api";

export function RepositoryDetailsView() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const apiAccessToken = useAuthSessionStore((state) => state.accessToken);
  const repositoryQuery = useQuery({
    queryKey: ["repositories", id],
    queryFn: () => getRepository(apiAccessToken, id ?? ""),
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

  return (
    <>
      <PageHeading
        eyebrow="Repository"
        title={repository?.fullName ?? "Repository details"}
        description={repository?.description ?? "Stored repository metadata."}
        actions={
          repository ? (
            <Button asChild variant="outline">
              <a href={repository.htmlUrl} target="_blank" rel="noreferrer">
                <ExternalLink />
                GitHub
              </a>
            </Button>
          ) : null
        }
      />

      {!apiAccessToken ? (
        <RepositoryState
          title="Session required"
          description="Sign in with GitHub to load repository metadata."
          action={
            <Button asChild>
              <a href={getGitHubLoginUrl()}>Sign in with GitHub</a>
            </Button>
          }
        />
      ) : null}

      {apiAccessToken && repositoryQuery.isLoading ? (
        <RepositoryState title="Loading repository" description="Fetching stored metadata." />
      ) : null}

      {apiAccessToken && repositoryQuery.isError ? (
        <RepositoryErrorState onRetry={() => void repositoryQuery.refetch()} />
      ) : null}

      {repository ? (
        <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="rounded-md border bg-card/70">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-medium">Metadata</h2>
            </div>
            <dl className="grid gap-px bg-border sm:grid-cols-2">
              {[
                ["GitHub ID", repository.githubId],
                ["Owner", repository.owner],
                ["Default branch", repository.defaultBranch],
                ["Language", repository.language ?? "Unknown"],
                ["Clone URL", repository.cloneUrl],
                ["Updated on GitHub", new Date(repository.githubUpdatedAt).toLocaleString()],
                ["Last synced", new Date(repository.lastSyncedAt).toLocaleString()],
                ["Archived", repository.isArchived ? "Yes" : "No"]
              ].map(([label, value]) => (
                <div key={label} className="min-w-0 bg-card/95 p-4">
                  <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
                  <dd className="mt-1 truncate text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <aside className="grid content-start gap-3">
            <div className="rounded-md border bg-card/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <Badge tone={repository.visibility === "PRIVATE" ? "muted" : "success"}>
                  {repository.visibility.toLowerCase()}
                </Badge>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Star className="size-4" />
                    {repository.stars}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <GitFork className="size-4" />
                    {repository.forks}
                  </span>
                </div>
              </div>
            </div>
            <Button
              type="button"
              disabled={syncMutation.isPending}
              onClick={() => syncMutation.mutate()}
            >
              <RefreshCw />
              {syncMutation.isPending ? "Syncing" : "Sync metadata"}
            </Button>
            <Button asChild variant="outline">
              <Link to="/repositories">Back to repositories</Link>
            </Button>
            {syncMutation.isSuccess ? (
              <p className="text-sm text-primary">Metadata synchronized.</p>
            ) : null}
            {syncMutation.isError ? (
              <p className="text-sm text-destructive">Metadata sync failed.</p>
            ) : null}
          </aside>
        </section>
      ) : null}
    </>
  );
}
