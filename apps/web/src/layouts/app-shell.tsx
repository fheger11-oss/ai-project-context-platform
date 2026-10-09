import { Outlet } from "react-router-dom";
import { useLocation } from "react-router-dom";
import type { ReactNode } from "react";

import { Sidebar } from "@/layouts/sidebar";
import { ProjectNavigation } from "@/layouts/project-navigation";
import { useShellContext } from "@/layouts/shell-context";
import { Topbar } from "@/layouts/topbar";
import { useLayoutStore } from "@/stores/layout-store";

type AppShellProps = {
  children?: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const shellContext = useShellContext(location);
  const mobileSidebarOpen = useLayoutStore((state) => state.mobileSidebarOpen);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <Sidebar shellContext={shellContext} />
        <div
          aria-hidden={mobileSidebarOpen ? true : undefined}
          className="flex min-w-0 flex-1 flex-col"
          inert={mobileSidebarOpen ? true : undefined}
        >
          <Topbar shellContext={shellContext} />
          <main className="flex-1 bg-background/80 px-4 py-5 md:px-6 md:py-6 xl:px-8">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 md:gap-6">
              <ProjectNavigation shellContext={shellContext} />
              {children ?? <Outlet />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
