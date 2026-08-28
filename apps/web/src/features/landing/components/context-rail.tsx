import { Bot, Braces, FileText, GitBranch, Radar, ScanLine } from "lucide-react";

import { cn } from "@/lib/utils";

const railSteps = [
  { label: "Repository", icon: GitBranch },
  { label: "Scan", icon: ScanLine },
  { label: "Understand", icon: Radar },
  { label: "Context", icon: Braces },
  { label: "Documents", icon: FileText },
  { label: "AI Export", icon: Bot }
];

type ContextRailProps = {
  className?: string;
};

export function ContextRail({ className }: ContextRailProps) {
  return (
    <aside aria-label="Ctxaro pipeline" className={cn("hidden w-14 shrink-0 lg:block", className)}>
      <div className="sticky top-28 flex h-[34rem] flex-col items-center">
        <div className="absolute bottom-0 top-0 w-px bg-gradient-to-b from-transparent via-white/14 to-transparent" />
        <div className="landing-rail-pulse absolute top-8 h-20 w-px bg-gradient-to-b from-transparent via-primary to-transparent" />
        <ol className="relative z-10 flex h-full flex-col justify-between py-5">
          {railSteps.map((step, index) => (
            <li key={step.label} className="group relative flex items-center">
              <div
                className={cn(
                  "grid size-8 place-items-center rounded-md border border-white/10 bg-[#0b100e]/90 text-muted-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur",
                  index === 2 &&
                    "border-primary/35 text-primary shadow-[0_0_26px_rgba(69,211,154,0.18)]"
                )}
              >
                <step.icon className="size-3.5" aria-hidden="true" />
              </div>
              <span className="pointer-events-none absolute left-11 whitespace-nowrap rounded-md border border-white/10 bg-[#0b100e]/95 px-2 py-1 text-[11px] font-medium text-subtle-foreground opacity-0 shadow-[var(--shadow-soft)] transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                {step.label}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
