import { AlertCircle, ArrowRight, Check, Circle, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type WorkflowStepStatus =
  "actionable" | "available" | "completed" | "current" | "failed" | "running" | "unavailable";

export type AnalysisWorkflowStep = {
  description: string;
  href?: string;
  icon: LucideIcon;
  key: string;
  label: string;
  status: WorkflowStepStatus;
};

export type NextStepAction = {
  busy?: boolean;
  disabled?: boolean;
  href?: string;
  label: string;
  onClick?: () => void;
};

export type NextStepRecommendation = {
  action?: NextStepAction;
  description: string;
  eyebrow: "Next step" | "Workflow ready";
  title: string;
};

const statusLabels: Record<WorkflowStepStatus, string> = {
  actionable: "Ready",
  available: "Available",
  completed: "Completed",
  current: "Current",
  failed: "Failed",
  running: "Running",
  unavailable: "Unavailable"
};

const statusClasses: Record<WorkflowStepStatus, string> = {
  actionable: "border-primary/35 bg-primary/10 text-primary",
  available: "border-success/30 bg-success/10 text-success",
  completed: "border-success/35 bg-success/10 text-success",
  current: "border-primary/40 bg-primary/10 text-primary",
  failed: "border-error/35 bg-error/10 text-error",
  running: "border-primary/35 bg-primary/10 text-primary",
  unavailable: "border-border bg-muted text-muted-foreground"
};

function StatusIcon({ status }: { status: WorkflowStepStatus }) {
  if (status === "completed" || status === "available") {
    return <Check className="size-3.5" aria-hidden="true" />;
  }

  if (status === "failed") {
    return <AlertCircle className="size-3.5" aria-hidden="true" />;
  }

  if (status === "running") {
    return <Loader2 className="size-3.5 motion-safe:animate-spin" aria-hidden="true" />;
  }

  if (status === "current") {
    return <Circle className="size-3 fill-current motion-safe:animate-pulse" aria-hidden="true" />;
  }

  return <ArrowRight className="size-3.5" aria-hidden="true" />;
}

export function AnalysisWorkflowNav({
  nextStep,
  steps
}: {
  nextStep: NextStepRecommendation;
  steps: readonly AnalysisWorkflowStep[];
}) {
  return (
    <section className="grid min-w-0 gap-3" aria-label="Analysis workflow">
      <nav
        className="sticky top-3 z-20 min-w-0 overflow-hidden rounded-md border border-border bg-card/95 p-2 shadow-[var(--shadow-control)] backdrop-blur"
        aria-label="Workflow sections"
      >
        <ol className="flex w-full min-w-0 gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-6 sm:overflow-visible sm:pb-0">
          {steps.map((step, index) => (
            <li
              key={step.key}
              className="flex min-w-[10.5rem] shrink-0 items-stretch gap-2 sm:min-w-0 sm:shrink"
            >
              <WorkflowStepButton step={step} />
              {index < steps.length - 1 ? (
                <span className="hidden w-px self-center bg-border sm:block" aria-hidden="true" />
              ) : null}
            </li>
          ))}
        </ol>
      </nav>

      <NextStepCard recommendation={nextStep} />
    </section>
  );
}

function WorkflowStepButton({ step }: { step: AnalysisWorkflowStep }) {
  const Icon = step.icon;
  const isDisabled = !step.href || step.status === "unavailable";
  const content = (
    <>
      <span
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center rounded border",
          statusClasses[step.status]
        )}
      >
        <StatusIcon status={step.status} />
      </span>
      <span className="min-w-0 text-left">
        <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate">{step.label}</span>
        </span>
        <span className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          <span className="shrink-0">{statusLabels[step.status]}</span>
          <span aria-hidden="true">/</span>
          <span className="truncate">{step.description}</span>
        </span>
      </span>
    </>
  );

  if (isDisabled) {
    return (
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded px-2 py-2 text-left opacity-65"
        aria-disabled="true"
        disabled
      >
        {content}
      </button>
    );
  }

  return (
    <a
      href={step.href}
      className="flex w-full items-center gap-2 rounded px-2 py-2 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:outline-none"
      aria-current={step.status === "current" ? "step" : undefined}
      aria-label={`${step.label}: ${statusLabels[step.status]}. ${step.description}`}
    >
      {content}
    </a>
  );
}

function NextStepCard({ recommendation }: { recommendation: NextStepRecommendation }) {
  return (
    <div className="rounded-md border border-border bg-card/95 p-4 shadow-[var(--shadow-control)] backdrop-blur">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase text-primary">{recommendation.eyebrow}</p>
          <h2 className="mt-1 text-base font-semibold text-foreground">{recommendation.title}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            {recommendation.description}
          </p>
        </div>
        {recommendation.action ? <NextStepActionButton action={recommendation.action} /> : null}
      </div>
    </div>
  );
}

function NextStepActionButton({ action }: { action: NextStepAction }) {
  if (action.href) {
    return (
      <Button asChild size="sm" variant={action.disabled ? "outline" : "default"}>
        <a aria-disabled={action.disabled ? "true" : undefined} href={action.href}>
          {action.busy ? <Loader2 className="motion-safe:animate-spin" /> : <ArrowRight />}
          {action.label}
        </a>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      disabled={action.disabled}
      aria-busy={action.busy}
      onClick={action.onClick}
    >
      {action.busy ? <Loader2 className="motion-safe:animate-spin" /> : <ArrowRight />}
      {action.label}
    </Button>
  );
}
