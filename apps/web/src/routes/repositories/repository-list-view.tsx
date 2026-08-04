import { GitBranch, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { PageHeading } from "@/components/typography/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RepositoryCard } from "@/features/repositories/components/repository-card";
import {
  RepositoryErrorState,
  RepositoryState
} from "@/features/repositories/components/repository-state";
import { listRepositories } from "@/features/repositories/api/repositories-api";
import { useRepositoryConnectionStore } from "@/features/repositories/stores/repository-connection-store";

export function RepositoryListView() {
  const apiAccessToken = useRepositoryConnectionStore((state) => state.apiAccessToken);
  const repositoriesQuery = useQuery({
    queryKey: ["repositories"],
    queryFn: () => listRepositories(apiAccessToken),
    enabled: Boolean(apiAccessToken)
  });
  const repositories = repositoriesQuery.data?.repositories ?? [];

  return (
    <>
      <PageHeading
        eyebrow="Repository Engine"
        title="Repositories"
        description="Connected GitHub repositories available to future engines."
        actions={
          <Button asChild>
            <Link to="/repositories/connect">
              <Plus />
              Connect
            </Link>
          </Button>
        }
      />

      {!apiAccessToken ? (
        <RepositoryState
          title="Session required"
          description="Add an API access token before loading connected repositories."
          action={
            <Button asChild variant="outline">
              <Link to="/repositories/connect">Open connection</Link>
            </Button>
          }
        />
      ) : null}

      {apiAccessToken && repositoriesQuery.isLoading ? (
        <RepositoryState title="Loading repositories" description="Fetching stored metadata." />
      ) : null}

      {apiAccessToken && repositoriesQuery.isError ? (
        <RepositoryErrorState onRetry={() => void repositoriesQuery.refetch()} />
      ) : null}

      {apiAccessToken && repositoriesQuery.isSuccess && repositories.length === 0 ? (
        <RepositoryState
          title="No repositories connected"
          description="Connect a GitHub repository to make it available to the next engine."
          action={
            <Button asChild>
              <Link to="/repositories/connect">
                <GitBranch />
                Connect repository
              </Link>
            </Button>
          }
        />
      ) : null}

      {repositories.length > 0 ? (
        <section className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{repositories.length} connected</p>
            <Badge tone="success">Ready</Badge>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {repositories.map((repository) => (
              <RepositoryCard key={repository.id} repository={repository} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
