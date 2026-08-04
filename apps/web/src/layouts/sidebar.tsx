import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { NavLink } from "react-router-dom";

import { TextShimmer } from "@/components/reactbits/text-shimmer";
import { StatusDot } from "@/components/shared/status-dot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { primaryNavigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useLayoutStore } from "@/stores/layout-store";

export function Sidebar() {
  const collapsed = useLayoutStore((state) => state.sidebarCollapsed);
  const mobileOpen = useLayoutStore((state) => state.mobileSidebarOpen);
  const setMobileSidebarOpen = useLayoutStore((state) => state.setMobileSidebarOpen);
  const toggleSidebar = useLayoutStore((state) => state.toggleSidebar);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-background/70 backdrop-blur-sm transition-opacity md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setMobileSidebarOpen(false)}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col border-r bg-background/96 backdrop-blur-xl transition-transform duration-200 md:sticky md:top-0 md:z-auto md:h-screen md:translate-x-0 md:bg-background/88 md:transition-[width]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "md:w-[76px]" : "md:w-72"
        )}
      >
        <div className="flex h-16 items-center gap-3 px-4">
          <div className="grid size-9 place-items-center rounded-md border bg-card text-sm font-semibold text-primary">
            AI
          </div>
          <div className={cn("min-w-0 flex-1", collapsed && "md:hidden")}>
            <p className="truncate text-sm font-semibold">Project Context</p>
            <p className="truncate text-xs text-muted-foreground">
              <TextShimmer>Developer workspace</TextShimmer>
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Close navigation"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <X />
          </Button>
        </div>

        <Separator />

        <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Primary navigation">
          {primaryNavigation.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={() => setMobileSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  "group flex h-9 items-center gap-3 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  isActive && "bg-accent text-foreground",
                  item.status === "soon" && "pointer-events-none opacity-55",
                  collapsed && "md:justify-center"
                )
              }
            >
              <item.icon className="size-4 shrink-0" />
              <span className={cn("min-w-0 flex-1 truncate", collapsed && "md:hidden")}>
                {item.title}
              </span>
              <span className={cn(collapsed && "md:hidden")}>
                {item.status === "soon" ? <Badge tone="muted">Soon</Badge> : <StatusDot active />}
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="hidden border-t p-3 md:block">
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
