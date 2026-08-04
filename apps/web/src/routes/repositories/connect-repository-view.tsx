import { CheckCircle2, GitBranch, Loader2, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PageHeading } from "@/components/typography/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConnectionPanel } from "@/features/repositories/components/connection-panel";
import { RepositoryState } from "@/features/repositories/components/repository-state";
import {
  connectRepository,
  listAvailableGitHubRepositories
} from "@/features/repositories/api/repositories-api";
import type { AvailableGitHubRepository } from "@/features/repositories/api/repositories-api";
import { useRepositoryConnectionStore } from "@/features/repositories/stores/repository-connection-store";

export function ConnectRepositoryView() {
  const queryClient = useQueryClient();
  const apiAccessToken = useRepositoryConnectionStore((state) => state.apiAccessToken);
  const githubAccessToken = useRepositoryConnectionStore((state) => state.githubAccessToken);
  const canLoad = Boolean(apiAccessToken && githubAccessToken);
  const availableQuery = useQuery({
    queryKey: ["github-repositories", githubAccessToken],
    queryFn: () => listAvailableGitHubRepositories(apiAccessToken, githubAccessToken),
    enabled: false
  });
  const connectMutation = useMutation({
    mutationFn: (repository: AvailableGitHubRepository) =>
      connectRepository(apiAccessToken, {
        githubAccessToken,
        githubId: repository.githubId
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["repositories"] }),
        availableQuery.refetch()
      ]);
    }
  });
  const repositories = availableQuery.data?.repositories ?? [];

  return (
    <>
      <PageHeading
        eyebrow="GitHub"
        title="Connect repository"
        description="Import repository metadata from your GitHub account."
      />

      <ConnectionPanel
        submitLabel={availableQuery.isFetching ? "Loading" : "Load repositories"}
        isDisabled={!canLoad || availableQuery.isFetching}
        onSubmit={() => void availableQuery.refetch()}
      />

      {!canLoad ? (
        <RepositoryState
          title="Connection tokens required"
          description="Provide the API session token and GitHub access token to retrieve repositories."
        />
      ) : null}

      {availableQuery.isFetching ? (
        <RepositoryState title="Loading GitHub repositories" description="Reading metadata only." />
      ) : null}

      {availableQuery.isError ? (
        <RepositoryState
          title="GitHub repositories unavailable"
          description="The GitHub account could not be reached with the provided token."
        />
      ) : null}

      {availableQuery.isSuccess && repositories.length === 0 ? (
        <RepositoryState
          title="No GitHub repositories found"
          description="The authenticated GitHub account did not return repository metadata."
        />
      ) : null}

      {repositories.length > 0 ? (
        <section className="rounded-md border bg-card/60">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <GitBranch className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">GitHub repositories</h2>
            </div>
            <Badge tone="muted">{repositories.length}</Badge>
          </div>
          <div className="divide-y">
            {repositories.map((repository) => (
              <div
                key={repository.githubId}
                className="grid gap-3 px-4 py-3 md:grid-cols-[1fr_auto] md:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">{repository.fullName}</p>
                    <Badge tone={repository.visibility === "PRIVATE" ? "muted" : "success"}>
                      {repository.visibility.toLowerCase()}
                    </Badge>
                    {repository.isConnected ? <Badge tone="neutral">Connected</Badge> : null}
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                    {repository.description ?? "No description provided."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant={repository.isConnected ? "outline" : "default"}
                  disabled={repository.isConnected || connectMutation.isPending}
                  onClick={() => connectMutation.mutate(repository)}
                >
                  {repository.isConnected ? (
                    <CheckCircle2 />
                  ) : connectMutation.isPending ? (
                    <Loader2 />
                  ) : (
                    <Plus />
                  )}
                  {repository.isConnected ? "Selected" : "Select"}
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
