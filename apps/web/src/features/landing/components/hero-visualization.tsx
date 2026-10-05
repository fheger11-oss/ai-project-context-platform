import { CheckCircle2, GitBranch, History, RefreshCw, ScanLine } from "lucide-react";

const flow = [
  { label: "Repository change", icon: GitBranch },
  { label: "Scan + analysis", icon: ScanLine },
  { label: "Project Context", icon: CheckCircle2 }
];

export function HeroVisualization() {
  return (
    <div
      className="landing-mobile-visual relative mx-0 min-w-0 max-w-[36rem] sm:mx-auto lg:mx-0"
      aria-hidden="true"
    >
      <div className="landing-orbit absolute -inset-7 rounded-[2rem] border border-primary/10" />
      <div className="relative min-w-0 overflow-hidden rounded-lg border border-white/10 bg-[#07100d]/92 shadow-[0_24px_90px_rgba(0,0,0,0.42),0_0_0_1px_rgba(255,255,255,0.03)_inset] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.025] px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-medium text-subtle-foreground">
            <RefreshCw className="size-4 text-primary" />
            Continuous Project Context
          </div>
          <span className="rounded-full border border-primary/20 bg-primary/[0.08] px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
            Automatic Updates
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {flow.map(({ icon: Icon, label }, index) => (
              <div
                key={label}
                className="relative rounded-md border border-white/10 bg-black/20 p-3"
              >
                <div className="grid size-8 place-items-center rounded-md border border-primary/20 bg-primary/[0.07] text-primary">
                  <Icon className="size-4" />
                </div>
                <p className="mt-3 text-xs font-medium text-subtle-foreground">{label}</p>
                {index < flow.length - 1 ? (
                  <span className="landing-pipeline-connector absolute -right-3 top-1/2 hidden h-px w-3 bg-white/16 sm:block" />
                ) : null}
              </div>
            ))}
          </div>

          <section className="mt-4 rounded-md border border-primary/25 bg-primary/[0.05] p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Current Project Context
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  Verified against repository HEAD
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Repository, commit, scan, and analysis provenance match.
                </p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 font-mono text-[11px] font-semibold text-primary">
                <span className="landing-live-dot size-1.5 rounded-full bg-primary" />
                FRESH
              </span>
            </div>
          </section>

          <div className="mt-3 flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.02] px-4 py-3">
            <History className="size-4 shrink-0 text-muted-foreground" />
            <p className="text-xs leading-5 text-muted-foreground">
              Previous valid Project Context versions remain available.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
