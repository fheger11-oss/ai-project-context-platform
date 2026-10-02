import { BookOpen, Clock3, GitCompareArrows, Scale } from "lucide-react";

const memoryItems = [
  {
    label: "Project Knowledge",
    description: "Durable facts the project should retain.",
    icon: BookOpen
  },
  {
    label: "Project Decisions",
    description: "Important choices and their lifecycle.",
    icon: Scale
  },
  {
    label: "Timeline",
    description: "A chronological record of project activity.",
    icon: Clock3
  },
  {
    label: "Architecture History",
    description: "Structural change across context snapshots.",
    icon: GitCompareArrows
  }
];

export function ProjectMemoryPreview() {
  return (
    <article className="landing-proof-panel relative overflow-hidden rounded-lg border border-primary/18 bg-[#07100d]/92 p-4 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
      <div className="absolute right-0 top-16 h-24 w-px bg-gradient-to-b from-transparent via-primary to-transparent" />
      <div className="mb-5 flex items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            Project Memory
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">What the project retains</h3>
        </div>
        <div className="grid size-10 place-items-center rounded-md border border-primary/20 bg-primary/10 text-primary">
          <Clock3 className="size-5" aria-hidden="true" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {memoryItems.map((item, index) => (
          <div
            key={item.label}
            className="landing-proof-row rounded-md border border-white/10 bg-white/[0.025] p-3"
            style={{ transitionDelay: `${index * 100}ms` }}
          >
            <item.icon className="size-4 text-primary" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-subtle-foreground">{item.label}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
