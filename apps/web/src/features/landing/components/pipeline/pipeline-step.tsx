import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type PipelineStepProps = {
  description: string;
  icon: LucideIcon;
  index: number;
  isLast?: boolean;
  title: string;
};

export function PipelineStep({
  description,
  icon: Icon,
  index,
  isLast = false,
  title
}: PipelineStepProps) {
  const stepNumber = String(index + 1).padStart(2, "0");

  return (
    <li className="relative min-w-0 md:flex-1">
      <article className="relative z-10 flex h-full min-h-48 flex-col rounded-md border border-white/10 bg-[#08100e]/88 p-4 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] backdrop-blur">
        <div className="mb-5 flex items-center justify-between gap-3">
          <span className="font-mono text-xs text-primary">{stepNumber}</span>
          <span className="landing-pipeline-node grid size-8 place-items-center rounded-md border border-primary/24 bg-primary/10 text-primary">
            <Icon className="size-4" aria-hidden="true" />
          </span>
        </div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
        <div className="mt-auto pt-5">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary/80" />
            active stage
          </div>
        </div>
      </article>
      {!isLast ? (
        <span
          aria-hidden="true"
          className={cn(
            "landing-pipeline-connector absolute bg-white/10",
            "left-1/2 top-full h-8 w-px md:left-auto md:right-[-1.5rem] md:top-1/2 md:h-px md:w-12"
          )}
        />
      ) : null}
    </li>
  );
}
