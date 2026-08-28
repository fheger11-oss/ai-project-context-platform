import { Bot, Braces, FileQuestion, Layers3 } from "lucide-react";

export function WorkflowComparison() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
      <section className="rounded-lg border border-white/10 bg-white/[0.022] p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Without structured context
        </p>
        <div className="mt-4 grid gap-2">
          {["Scattered files", "Repeated explanations", "Project shape rediscovered each time"].map(
            (label, index) => (
              <div
                key={label}
                className="landing-loose-row flex items-center gap-2 rounded-sm border border-white/8 bg-black/20 px-3 py-2 text-sm text-muted-foreground"
                style={{ animationDelay: `${index * 180}ms` }}
              >
                <FileQuestion className="size-4 text-muted-foreground" aria-hidden="true" />
                {label}
              </div>
            )
          )}
        </div>
      </section>

      <section className="rounded-lg border border-primary/16 bg-primary/[0.04] p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">With Ctxaro</p>
        <div className="mt-4 grid gap-2">
          {[
            "Project Context",
            "Architecture + Modules + Dependencies",
            "Reusable AI-ready context"
          ].map((label) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-sm border border-primary/18 bg-[#08100e]/70 px-3 py-2 text-sm text-subtle-foreground"
            >
              <Layers3 className="size-4 text-primary" aria-hidden="true" />
              {label}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-[#08100e]/72 p-4 lg:col-span-2">
        <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
          <WorkflowNode label="Your repository" icon={FileQuestion} />
          <Connector />
          <WorkflowNode label="Project Context" icon={Braces} active />
          <Connector />
          <WorkflowNode label="Documents + AI Export" icon={Bot} active />
        </div>
      </section>
    </div>
  );
}

function WorkflowNode({
  active = false,
  icon: Icon,
  label
}: {
  active?: boolean;
  icon: typeof FileQuestion;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.025] p-3">
      <div
        className={
          active
            ? "grid size-9 place-items-center rounded-md border border-primary/25 bg-primary/10 text-primary"
            : "grid size-9 place-items-center rounded-md border border-white/10 bg-black/18 text-muted-foreground"
        }
      >
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-subtle-foreground">{label}</p>
    </div>
  );
}

function Connector() {
  return (
    <div
      className="landing-workflow-connector h-8 w-px bg-white/12 md:h-px md:w-14"
      aria-hidden="true"
    />
  );
}
