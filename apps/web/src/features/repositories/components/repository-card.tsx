import { Archive, ArrowRight, GitBranch, GitFork, Star } from "lucide-react";
import { Link } from "react-router-dom";

import { StatusDot } from "@/components/shared/status-dot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RepositorySummary } from "@/features/repositories/api/repositories-api";
import { RepositoryScanAction } from "@/features/scans/components/repository-scan-action";

type RepositoryCardProps = {
  accessToken: string;
  repository: RepositorySummary;
};

export function RepositoryCard({ accessToken, repository }: RepositoryCardProps) {
  const [owner, name] = repository.fullName.includes("/")
    ? repository.fullName.split("/")
    : [repository.owner, repository.fullName];

  return (
    <article className="grid gap-4 rounded-md border border-border bg-card/70 p-4 transition-[background-color,border-color,box-shadow] duration-150 hover:border-border-strong hover:bg-surface-raised">
      <Link
        to={`/repositories/${repository.id}`}
        className="group block rounded-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={`Open ${repository.fullName}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="truncate">{owner}</span>
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
            <h2 className="mt-1 truncate text-base font-semibold text-foreground transition-colors group-hover:text-primary">
              {name}
            </h2>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
              {repository.description ?? "No description provided."}
            </p>
          </div>
          <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
            {new Date(repository.githubUpdatedAt).toLocaleDateString()}
          </span>
        </div>
      </Link>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <StatusDot active tone="success" />
          Connected
        </span>
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <GitBranch className="size-3.5" />
          <span className="truncate">{repository.defaultBranch}</span>
        </span>
        <span className={cn("font-medium", repository.language && "text-subtle-foreground")}>
          {repository.language ?? "Unknown language"}
        </span>
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

      <div className="flex justify-end border-t border-border/70 pt-3">
        <Button asChild size="sm" variant="outline">
          <Link to={`/repositories/${repository.id}`}>
            Open project
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </article>
  );
}
