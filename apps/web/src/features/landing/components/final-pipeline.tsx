import { Bot, Braces, FileText, GitBranch, Network, ScanLine } from "lucide-react";

const finalSteps = [
  { label: "Repository", icon: GitBranch },
  { label: "Scan", icon: ScanLine },
  { label: "Analysis", icon: Network },
  { label: "Project Context", icon: Braces },
  { label: "Documents", icon: FileText },
  { label: "AI Export", icon: Bot }
];

export function FinalPipeline() {
  return (
    <div className="relative mx-auto w-full max-w-4xl" aria-hidden="true">
      <div className="landing-final-spine absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/12" />
      <div className="grid gap-3">
        {finalSteps.map((step, index) => (
          <div
            key={step.label}
            className="landing-final-step relative mx-auto flex w-full max-w-sm items-center gap-3 rounded-md border border-white/10 bg-[#08100e]/88 p-3 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]"
            style={{ transitionDelay: `${index * 80}ms` }}
          >
            <div className="grid size-9 shrink-0 place-items-center rounded-md border border-primary/20 bg-primary/10 text-primary">
              <step.icon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </p>
              <p className="truncate text-sm font-medium text-subtle-foreground">{step.label}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="landing-final-converge mx-auto mt-5 h-12 w-px bg-white/12" />
    </div>
  );
}
