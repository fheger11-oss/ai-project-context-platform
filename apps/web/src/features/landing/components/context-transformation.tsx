import { Braces, Radar, ScanLine } from "lucide-react";

import { ContextOutputPreview } from "@/features/landing/components/context-output-preview";
import { RepositoryInputPreview } from "@/features/landing/components/repository-input-preview";

export function ContextTransformation() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.018] p-3 shadow-[0_24px_90px_rgba(0,0,0,0.3)] md:p-5 lg:p-6">
      <div className="landing-why-sheen absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
      <div className="relative grid gap-6 lg:grid-cols-[1fr_13rem_1fr] lg:items-stretch">
        <RepositoryInputPreview />
        <div className="relative flex min-h-40 items-center justify-center">
          <div className="landing-transform-line absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/12 lg:inset-x-0 lg:inset-y-1/2 lg:h-px lg:w-auto lg:translate-x-0" />
          <div className="landing-transform-signal absolute left-1/2 top-0 size-2 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_24px_rgba(69,211,154,0.75)] lg:left-0 lg:top-1/2 lg:-translate-y-1/2" />
          <div className="relative z-10 w-full max-w-44 rounded-lg border border-primary/25 bg-[#08100e]/95 p-4 text-center shadow-[0_0_42px_rgba(69,211,154,0.1)]">
            <div className="mx-auto mb-3 grid size-10 place-items-center rounded-md border border-primary/25 bg-primary/10 text-primary">
              <Braces className="size-5" aria-hidden="true" />
            </div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Ctxaro</p>
            <div className="mt-3 grid gap-2">
              <ProcessLabel icon={ScanLine} label="Scan" />
              <ProcessLabel icon={Radar} label="Analyze" />
              <ProcessLabel icon={Braces} label="Structure" />
            </div>
          </div>
        </div>
        <ContextOutputPreview />
      </div>
    </div>
  );
}

function ProcessLabel({ icon: Icon, label }: { icon: typeof ScanLine; label: string }) {
  return (
    <div className="landing-process-label flex items-center justify-center gap-2 rounded-sm border border-white/10 bg-white/[0.035] px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
      <Icon className="size-3 text-primary" aria-hidden="true" />
      {label}
    </div>
  );
}
