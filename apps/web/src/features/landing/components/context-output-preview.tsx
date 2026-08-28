import { Braces, CheckCircle2 } from "lucide-react";

const contextRows = [
  "Project identity",
  "Technology stack",
  "Architecture",
  "Modules",
  "Dependencies",
  "Entry Points",
  "Testing",
  "Infrastructure",
  "Evidence"
];

export function ContextOutputPreview() {
  return (
    <article className="landing-why-panel relative h-full overflow-hidden rounded-lg border border-primary/16 bg-[#07100d]/92 p-4 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
      <div className="landing-context-organize absolute right-0 top-20 h-24 w-px bg-gradient-to-b from-transparent via-primary to-transparent" />
      <div className="mb-4 flex items-center justify-between gap-4 border-b border-white/10 pb-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            Structured Project Context
          </p>
          <h3 className="mt-2 text-base font-semibold text-white">Reusable understanding</h3>
        </div>
        <div className="grid size-9 place-items-center rounded-md border border-primary/20 bg-primary/10 text-primary">
          <Braces className="size-4" aria-hidden="true" />
        </div>
      </div>

      <div className="grid gap-2">
        {contextRows.map((row, index) => (
          <div
            key={row}
            className="landing-context-row flex items-center justify-between gap-3 rounded-sm border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs text-subtle-foreground"
            style={{ transitionDelay: `${index * 70}ms` }}
          >
            <span>{row}</span>
            <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-primary">
              <CheckCircle2 className="size-3" aria-hidden="true" />
              mapped
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}
