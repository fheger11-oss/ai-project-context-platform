import { ChevronRight, FolderGit2, Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getScanHistory, getScanLimits } from "@/features/scans/api/scan-api";
import { ScanUsagePill } from "@/features/scans/components/scan-usage";
import type { ShellContext } from "@/layouts/shell-context";
import { repositoryDisplayName, repositoryOwner } from "@/layouts/shell-context";
import { useAuthSessionStore } from "@/features/auth/stores/auth-session-store";
import { useLayoutStore } from "@/stores/layout-store";

type TopbarProps = {
  shellContext: ShellContext;
};

export function Topbar({ shellContext }: TopbarProps) {
  const toggleMobileSidebar = useLayoutStore((state) => state.toggleMobileSidebar);
  const apiAccessToken = useAuthSessionStore((state) => state.accessToken);
  const repository = shellContext.currentRepository;
  const latestScanQuery = useQuery({
    queryKey: ["scan-history", repository?.id, 1, 1],
    queryFn: () => getScanHistory(apiAccessToken, repository?.id ?? "", 1, 1),
    enabled: Boolean(apiAccessToken && repository)
  });
  const limitsQuery = useQuery({
    queryKey: ["scan-limits"],
    queryFn: () => getScanLimits(apiAccessToken),
    enabled: Boolean(apiAccessToken)
  });
  const latestScan = latestScanQuery.data?.items[0] ?? null;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/80 bg-surface/88 px-4 backdrop-blur-xl md:px-6 lg:px-8">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Open navigation"
        onClick={toggleMobileSidebar}
      >
        <Menu />
      </Button>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="grid min-w-0 flex-1 gap-0.5">
          <Breadcrumbs shellContext={shellContext} />
          <div className="flex min-w-0 items-center gap-2 md:hidden">
            <span className="truncate text-sm font-medium text-foreground">
              {repository ? repositoryDisplayName(repository) : shellContext.section}
            </span>
            {repository ? (
              <span className="truncate text-xs text-muted-foreground">
                {repositoryOwner(repository)}
              </span>
            ) : null}
          </div>
        </div>
        <Separator orientation="vertical" className="hidden h-5 lg:block" />
        {repository ? <ProjectPill shellContext={shellContext} /> : null}
        {repository && limitsQuery.data ? (
          <ScanUsagePill limits={limitsQuery.data} scan={latestScan} />
        ) : null}
      </div>
      <ThemeToggle />
    </header>
  );
}

function Breadcrumbs({ shellContext }: { shellContext: ShellContext }) {
  const breadcrumbs = shellContext.breadcrumbs;

  return (
    <nav className="hidden min-w-0 items-center gap-1 text-sm md:flex" aria-label="Breadcrumb">
      <ol className="flex min-w-0 items-center gap-1">
        {breadcrumbs.map((breadcrumb, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <li className="flex min-w-0 items-center gap-1" key={`${breadcrumb.label}-${index}`}>
              {breadcrumb.href && !isLast ? (
                <Link
                  className="truncate rounded-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  to={breadcrumb.href}
                >
                  {breadcrumb.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className="truncate font-medium text-subtle-foreground"
                >
                  {breadcrumb.label}
                </span>
              )}
              {!isLast ? (
                <ChevronRight aria-hidden="true" className="size-3.5 text-muted-foreground" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ProjectPill({ shellContext }: { shellContext: ShellContext }) {
  const repository = shellContext.currentRepository;

  if (!repository || !shellContext.projectHref) {
    return null;
  }

  return (
    <Link
      className="hidden h-9 max-w-[18rem] items-center gap-2 rounded-md border border-border bg-surface-raised px-3 text-sm shadow-[var(--shadow-control)] outline-none transition-[background-color,border-color,color] duration-150 hover:border-border-strong hover:bg-surface-elevated focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:flex"
      to={shellContext.projectHref}
    >
      <FolderGit2 className="size-4 shrink-0 text-primary" />
      <span className="min-w-0 truncate font-medium text-foreground">
        {repositoryDisplayName(repository)}
      </span>
      <span className="truncate text-xs text-muted-foreground">{repository.defaultBranch}</span>
    </Link>
  );
}
