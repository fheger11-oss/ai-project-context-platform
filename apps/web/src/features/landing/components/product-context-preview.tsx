import { CheckCircle2, CircleDot, Layers3 } from "lucide-react";

const contextGroups = [
  {
    label: "Project",
    items: ["Ctxaro", "TypeScript", "React", "Node.js"]
  },
  {
    label: "Architecture",
    items: ["Modular monorepo", "apps/web", "apps/api"]
  },
  {
    label: "Modules",
    items: [
      "Authentication",
      "Repository",
      "Scanning",
      "Analysis",
      "Context",
      "Documents",
      "AI Export"
    ]
  },
  {
    label: "Dependencies",
    items: ["React", "NestJS", "Prisma", "PostgreSQL"]
  }
];

export function ProductContextPreview() {
  return (
    <article className="landing-proof-panel landing-context-preview relative overflow-hidden rounded-lg border border-white/10 bg-[#07100d]/92 p-4 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
      <div className="landing-context-signal absolute left-0 top-16 h-20 w-px bg-gradient-to-b from-transparent via-primary to-transparent" />
      <div className="mb-5 flex items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            Project Context
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">Structured project knowledge</h3>
        </div>
        <div className="grid size-10 place-items-center rounded-md border border-primary/20 bg-primary/10 text-primary">
          <Layers3 className="size-5" aria-hidden="true" />
        </div>
      </div>

      <div className="grid gap-3">
        {contextGroups.map((group, groupIndex) => (
          <section
            key={group.label}
            className="landing-proof-row rounded-md border border-white/10 bg-white/[0.025] p-3"
            style={{ transitionDelay: `${groupIndex * 120}ms` }}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {group.label}
              </p>
              <span className="h-px flex-1 bg-white/10" />
            </div>
            <div className="flex flex-wrap gap-2">
              {group.items.map((item) => (
                <span
                  key={item}
                  className="rounded-sm border border-white/10 bg-black/18 px-2 py-1 text-xs text-subtle-foreground"
                >
                  {item}
                </span>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="landing-proof-row mt-4 grid gap-2 rounded-md border border-primary/20 bg-primary/[0.045] p-3 sm:grid-cols-2">
        <div className="flex items-center gap-2 text-xs text-subtle-foreground">
          <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
          Observed claims
        </div>
        <div className="flex items-center gap-2 text-xs text-subtle-foreground">
          <CircleDot className="size-4 text-primary" aria-hidden="true" />
          Inferred context
        </div>
      </div>
    </article>
  );
}
