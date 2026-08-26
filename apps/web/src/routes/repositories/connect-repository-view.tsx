import { GitBranch, Loader2, Plus, Unlink } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PageHeading } from "@/components/typography/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getGitHubLoginUrl } from "@/features/auth/api/auth-api";
import { useAuthSessionStore } from "@/features/auth/stores/auth-session-store";
import { RepositoryState } from "@/features/repositories/components/repository-state";
import {
  connectRepository,
  disconnectRepository,
  listAvailableGitHubRepositories
} from "@/features/repositories/api/repositories-api";
import type { AvailableGitHubRepository } from "@/features/repositories/api/repositories-api";

export function ConnectRepositoryView() {
  const queryClient = useQueryClient();
  const apiAccessToken = useAuthSessionStore((state) => state.accessToken);
  const canLoad = Boolean(apiAccessToken);
  const availableQuery = useQuery({
    queryKey: ["github-repositories"],
    queryFn: () => listAvailableGitHubRepositories(apiAccessToken),
    enabled: canLoad
  });
  const connectMutation = useMutation({
    mutationFn: (repository: AvailableGitHubRepository) =>
      connectRepository(apiAccessToken, repository.githubId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["repositories"] }),
        availableQuery.refetch()
      ]);
    }
  });
  const disconnectMutation = useMutation({
    mutationFn: (repository: AvailableGitHubRepository) => {
      if (!repository.connectedRepositoryId) {
        throw new Error("Connected repository was not found.");
      }

      return disconnectRepository(apiAccessToken, repository.connectedRepositoryId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["repositories"] }),
        availableQuery.refetch()
      ]);
    }
  });
  const repositories = availableQuery.data?.repositories ?? [];
  const isRepositoryMutationPending = connectMutation.isPending || disconnectMutation.isPending;

  return (
    <>
      <PageHeading
        eyebrow="GitHub"
        title="Connect repository"
        description="Import repository metadata from your GitHub account."
      />

      {!canLoad ? (
        <RepositoryState
          title="Session required"
          description="Sign in with GitHub to retrieve repositories."
          action={
            <Button asChild>
              <a href={getGitHubLoginUrl()}>Sign in with GitHub</a>
            </Button>
          }
        />
      ) : null}

      {availableQuery.isFetching ? (
        <RepositoryState
          title="Loading GitHub repositories"
          description="Loading repositories available to connect."
        />
      ) : null}

      {availableQuery.isError ? (
        <RepositoryState
          title="GitHub repositories unavailable"
          description="The authenticated GitHub account could not be reached."
          action={
            <Button type="button" variant="outline" onClick={() => void availableQuery.refetch()}>
              Retry
            </Button>
          }
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
                {(() => {
                  const isConnecting =
                    connectMutation.isPending &&
                    connectMutation.variables?.githubId === repository.githubId;
                  const isDisconnecting =
                    disconnectMutation.isPending &&
                    disconnectMutation.variables?.githubId === repository.githubId;

                  return (
                    <>
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
                        variant={repository.isConnected ? "destructive" : "default"}
                        disabled={
                          isRepositoryMutationPending ||
                          (repository.isConnected && !repository.connectedRepositoryId)
                        }
                        onClick={() => {
                          if (repository.isConnected) {
                            disconnectMutation.mutate(repository);
                            return;
                          }

                          connectMutation.mutate(repository);
                        }}
                      >
                        {isConnecting || isDisconnecting ? (
                          <Loader2 className="animate-spin" />
                        ) : repository.isConnected ? (
                          <Unlink />
                        ) : (
                          <Plus />
                        )}
                        {repository.isConnected ? "Disconnect" : "Connect"}
                      </Button>
                    </>
                  );
                })()}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {connectMutation.isSuccess ? (
        <RepositoryState
          title="Repository connected"
          description="Repository metadata is stored and ready for scanning."
        />
      ) : null}

      {connectMutation.isError ? (
        <RepositoryState
          title="Repository could not be selected"
          description="The repository was not available for the authenticated GitHub account."
        />
      ) : null}

      {disconnectMutation.isError ? (
        <RepositoryState
          title="Repository could not be disconnected"
          description={
            disconnectMutation.error instanceof Error
              ? disconnectMutation.error.message
              : "The repository connection could not be removed."
          }
        />
      ) : null}
    </>
  );
}
