import { Menu, Search } from "lucide-react";

import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useLayoutStore } from "@/stores/layout-store";

export function Topbar() {
  const toggleMobileSidebar = useLayoutStore((state) => state.toggleMobileSidebar);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/82 px-4 backdrop-blur-xl md:px-6 lg:px-8">
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
        <div className="hidden text-sm text-muted-foreground sm:block">Frontend Foundation</div>
        <Separator orientation="vertical" className="hidden h-5 sm:block" />
        <button
          type="button"
          className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border bg-card/70 px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-accent sm:max-w-md"
        >
          <Search className="size-4 shrink-0" />
          <span className="truncate">Search commands, contexts, engines</span>
        </button>
      </div>
      <ThemeToggle />
    </header>
  );
}
