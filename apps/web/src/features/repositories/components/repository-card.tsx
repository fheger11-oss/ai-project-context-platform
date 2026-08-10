import { Archive, GitFork, Star } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RepositorySummary } from "@/features/repositories/api/repositories-api";
import { RepositoryScanAction } from "@/features/scans/components/repository-scan-action";

type RepositoryCardProps = {
  accessToken: string;
  repository: RepositorySummary;
};

export function RepositoryCard({ accessToken, repository }: RepositoryCardProps) {
  return (
    <article className="grid gap-3 rounded-md border bg-card/70 p-4">
      <Link
        to={`/repositories/${repository.id}`}
        className="group block transition-colors hover:text-primary"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-sm font-medium">{repository.fullName}</h2>
              <Badge tone={repository.visibility === "PRIVATE" ? "muted" : "success"}>
                {repository.visibility.toLowerCase()}
              </Badge>
              {repository.isArchived ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Archive className="size-3" />
                  Archived
                </span>
              ) : null}
            </div>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
              {repository.description ?? "No description provided."}
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {new Date(repository.githubUpdatedAt).toLocaleDateString()}
          </span>
        </div>
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className={cn("font-medium", repository.language && "text-foreground")}>
          {repository.language ?? "Unknown"}
        </span>
        <span>{repository.defaultBranch}</span>
        <span className="inline-flex items-center gap-1">
          <Star className="size-3" />
          {repository.stars}
        </span>
        <span className="inline-flex items-center gap-1">
          <GitFork className="size-3" />
          {repository.forks}
        </span>
      </div>
      <RepositoryScanAction accessToken={accessToken} repositoryId={repository.id} />
    </article>
  );
}
