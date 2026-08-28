import { Outlet } from "react-router-dom";
import { useLocation } from "react-router-dom";
import type { ReactNode } from "react";

import { Sidebar } from "@/layouts/sidebar";
import { useShellContext } from "@/layouts/shell-context";
import { Topbar } from "@/layouts/topbar";

type AppShellProps = {
  children?: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const shellContext = useShellContext(location);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <Sidebar shellContext={shellContext} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar shellContext={shellContext} />
          <main className="flex-1 bg-background/80 px-4 py-5 md:px-6 md:py-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 md:gap-6">
              {children ?? <Outlet />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
