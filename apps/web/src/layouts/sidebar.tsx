import { BarChart3, ChevronLeft, ChevronRight, FolderGit2, X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";

import { TextShimmer } from "@/components/reactbits/text-shimmer";
import { StatusDot } from "@/components/shared/status-dot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AuthUserSection } from "@/features/auth/components/auth-user-section";
import { CtxaroMark } from "@/features/brand/components/ctxaro-brand";
import { primaryNavigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import type { ShellContext } from "@/layouts/shell-context";
import { repositoryDisplayName, repositoryOwner } from "@/layouts/shell-context";
import { useLayoutStore } from "@/stores/layout-store";

type SidebarProps = {
  shellContext: ShellContext;
};

export function Sidebar({ shellContext }: SidebarProps) {
  const collapsed = useLayoutStore((state) => state.sidebarCollapsed);
  const mobileOpen = useLayoutStore((state) => state.mobileSidebarOpen);
  const setMobileSidebarOpen = useLayoutStore((state) => state.setMobileSidebarOpen);
  const toggleSidebar = useLayoutStore((state) => state.toggleSidebar);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!mobileOpen) {
      return undefined;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileSidebarOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [mobileOpen, setMobileSidebarOpen]);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-background/72 backdrop-blur-sm transition-opacity md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setMobileSidebarOpen(false)}
      />
      <aside
        aria-label="Application navigation"
        aria-modal={mobileOpen ? true : undefined}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col border-r border-border/80 bg-surface/96 backdrop-blur-xl transition-transform duration-200 md:sticky md:top-0 md:z-auto md:h-screen md:translate-x-0 md:bg-surface/92 md:transition-[width]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "md:w-[76px]" : "md:w-72"
        )}
        role={mobileOpen ? "dialog" : "complementary"}
      >
        <div className="flex h-16 items-center gap-3 px-4">
          <div className="grid size-9 shrink-0 place-items-center rounded-md border border-primary/20 bg-primary/10 text-primary shadow-[var(--shadow-control)]">
            <CtxaroMark className="size-5" />
          </div>
          <div className={cn("min-w-0 flex-1", collapsed && "md:hidden")}>
            <p className="truncate text-sm font-semibold lowercase">ctxaro</p>
            <p className="truncate text-xs text-muted-foreground">
              <TextShimmer>Developer workspace</TextShimmer>
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            ref={closeButtonRef}
            className="md:hidden"
            aria-label="Close navigation"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <X />
          </Button>
        </div>

        <Separator />

        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-3" aria-label="Primary">
          <NavigationGroup collapsed={collapsed} title="Product">
            {primaryNavigation.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === "/"}
                title={collapsed ? item.title : undefined}
                aria-label={collapsed ? item.title : undefined}
                onClick={() => setMobileSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "group relative flex h-9 items-center gap-3 rounded-md px-2 text-sm text-muted-foreground outline-none transition-[background-color,color,box-shadow] duration-150 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    isActive &&
                      "bg-accent text-foreground shadow-[var(--shadow-control)] before:absolute before:left-0 before:top-1/2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-primary",
                    collapsed && "md:justify-center"
                  )
                }
              >
                <item.icon className="size-4 shrink-0" />
                <span className={cn("min-w-0 flex-1 truncate", collapsed && "md:hidden")}>
                  {item.title}
                </span>
              </NavLink>
            ))}
          </NavigationGroup>

          <NavigationGroup collapsed={collapsed} title="Project">
            <ProjectIdentity
              collapsed={collapsed}
              onNavigate={() => setMobileSidebarOpen(false)}
              shellContext={shellContext}
            />
            {shellContext.projectHref ? (
              <NavLink
                to={shellContext.projectHref}
                title={collapsed ? "Repository" : undefined}
                aria-label={collapsed ? "Repository" : undefined}
                onClick={() => setMobileSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "group relative flex h-9 items-center gap-3 rounded-md px-2 text-sm text-muted-foreground outline-none transition-[background-color,color,box-shadow] duration-150 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    isActive &&
                      "bg-accent text-foreground shadow-[var(--shadow-control)] before:absolute before:left-0 before:top-1/2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-primary",
                    collapsed && "md:justify-center"
                  )
                }
              >
                <FolderGit2 className="size-4 shrink-0" />
                <span className={cn("min-w-0 flex-1 truncate", collapsed && "md:hidden")}>
                  Repository
                </span>
              </NavLink>
            ) : null}
            {shellContext.analysisId ? (
              <NavLink
                to={`/analyses/${encodeURIComponent(shellContext.analysisId)}`}
                title={collapsed ? "Analysis" : undefined}
                aria-label={collapsed ? "Analysis" : undefined}
                onClick={() => setMobileSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "group relative flex h-9 items-center gap-3 rounded-md px-2 text-sm text-muted-foreground outline-none transition-[background-color,color,box-shadow] duration-150 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    isActive &&
                      "bg-accent text-foreground shadow-[var(--shadow-control)] before:absolute before:left-0 before:top-1/2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-primary",
                    collapsed && "md:justify-center"
                  )
                }
              >
                <BarChart3 className="size-4 shrink-0" />
                <span className={cn("min-w-0 flex-1 truncate", collapsed && "md:hidden")}>
                  Analysis
                </span>
              </NavLink>
            ) : null}
          </NavigationGroup>
        </nav>

        <div className="grid gap-2 border-t border-border/80 p-3">
          <p
            className={cn(
              "px-2 text-[11px] font-medium uppercase leading-none text-muted-foreground",
              collapsed && "md:sr-only"
            )}
          >
            Account
          </p>
          <AuthUserSection collapsed={collapsed} />
        </div>

        <div className="hidden border-t border-border/80 p-3 md:block">
          <Button
            type="button"
            variant="ghost"
            className={cn("w-full", collapsed ? "px-0" : "justify-between")}
            aria-label="Toggle sidebar"
            onClick={toggleSidebar}
          >
            {!collapsed ? <span>Collapse</span> : null}
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </Button>
        </div>
      </aside>
    </>
  );
}

function NavigationGroup({
  children,
  collapsed,
  title
}: {
  children: ReactNode;
  collapsed: boolean;
  title: string;
}) {
  return (
    <div className="grid gap-1.5">
      <p
        className={cn(
          "px-2 text-[11px] font-medium uppercase leading-none text-muted-foreground",
          collapsed && "md:sr-only"
        )}
      >
        {title}
      </p>
      <div className="grid gap-1">{children}</div>
    </div>
  );
}

function ProjectIdentity({
  collapsed,
  onNavigate,
  shellContext
}: {
  collapsed: boolean;
  onNavigate: () => void;
  shellContext: ShellContext;
}) {
  const repository = shellContext.currentRepository;

  if (collapsed) {
    return (
      <Button
        asChild
        className="hidden md:inline-flex md:size-9 md:px-0"
        title={repository ? repository.fullName : "Projects"}
        variant="outline"
      >
        <Link
          aria-label={repository ? `Current project ${repository.fullName}` : "Projects"}
          to={shellContext.projectHref ?? "/repositories"}
          onClick={onNavigate}
        >
          <FolderGit2 />
        </Link>
      </Button>
    );
  }

  if (!repository) {
    return (
      <Link
        className="grid gap-2 rounded-md border border-dashed bg-card/55 p-3 text-sm outline-none transition-colors hover:border-border-strong hover:bg-card/80 focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        to="/repositories"
        onClick={onNavigate}
      >
        <span className="flex items-center gap-2 text-muted-foreground">
          <FolderGit2 className="size-4" />
          {shellContext.isProjectLoading ? "Loading project" : "No project selected"}
        </span>
        <span className="text-xs text-muted-foreground">Return to projects</span>
      </Link>
    );
  }

  return (
    <Link
      className="grid gap-2 rounded-md border border-border bg-card/70 p-3 outline-none transition-colors hover:border-border-strong hover:bg-surface-elevated focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      to={shellContext.projectHref ?? "/repositories"}
      onClick={onNavigate}
    >
      <span className="flex min-w-0 items-center gap-2">
        <FolderGit2 className="size-4 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {repositoryDisplayName(repository)}
        </span>
      </span>
      <span className="truncate text-xs text-muted-foreground">{repositoryOwner(repository)}</span>
      <span className="flex flex-wrap items-center gap-1.5">
        <Badge tone={repository.visibility === "PRIVATE" ? "muted" : "success"}>
          {repository.visibility.toLowerCase()}
        </Badge>
        <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <StatusDot active tone="success" />
          <span className="truncate">{repository.defaultBranch}</span>
        </span>
      </span>
    </Link>
  );
}
