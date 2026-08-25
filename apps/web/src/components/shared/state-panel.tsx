import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  type LucideIcon,
  MinusCircle
} from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type StatePanelTone = "empty" | "error" | "loading" | "neutral" | "success" | "warning";

type StatePanelProps = {
  action?: ReactNode;
  className?: string;
  description: ReactNode;
  icon?: LucideIcon;
  title: ReactNode;
  tone?: StatePanelTone;
};

const toneClasses: Record<StatePanelTone, string> = {
  empty: "border-dashed border-border bg-surface/70 text-muted-foreground",
  error: "border-error/30 bg-error/10 text-error",
  loading: "border-border bg-surface/70 text-muted-foreground",
  neutral: "border-border bg-card/70 text-muted-foreground",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning"
};

const defaultIcons: Record<StatePanelTone, LucideIcon> = {
  empty: MinusCircle,
  error: AlertCircle,
  loading: Loader2,
  neutral: Clock3,
  success: CheckCircle2,
  warning: AlertCircle
};

export function StatePanel({
  action,
  className,
  description,
  icon,
  title,
  tone = "neutral"
}: StatePanelProps) {
  const Icon = icon ?? defaultIcons[tone];

  return (
    <div className={cn("rounded-md border p-5", toneClasses[tone], className)}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md border bg-background/50">
          <Icon aria-hidden="true" className={cn("size-4", tone === "loading" && "animate-spin")} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-medium text-foreground">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
          {action ? <div className="mt-4 flex flex-wrap gap-2">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
