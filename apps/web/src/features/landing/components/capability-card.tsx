import type { LucideIcon } from "lucide-react";

type CapabilityCardProps = {
  description: string;
  icon: LucideIcon;
  label: string;
  title: string;
};

export function CapabilityCard({ description, icon: Icon, label, title }: CapabilityCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-md border border-white/10 bg-white/[0.028] p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] transition-colors hover:border-primary/24 hover:bg-white/[0.04]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="grid size-9 place-items-center rounded-md border border-primary/20 bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden="true" />
        </div>
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
      </div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
    </article>
  );
}
