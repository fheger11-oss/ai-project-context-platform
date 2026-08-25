import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?:
    "error" | "muted" | "neutral" | "pending" | "running" | "success" | "unavailable" | "warning";
};

const tones: Record<NonNullable<BadgeProps["tone"]>, string> = {
  error: "border-error/35 bg-error/10 text-error",
  muted: "border-border bg-muted text-muted-foreground",
  neutral: "border-border bg-secondary text-secondary-foreground",
  pending: "border-warning/30 bg-warning/10 text-warning",
  running: "border-primary/35 bg-primary/10 text-primary",
  success: "border-success/35 bg-success/10 text-success",
  unavailable: "border-border bg-unavailable/10 text-unavailable",
  warning: "border-warning/35 bg-warning/10 text-warning"
};

const markers: Record<NonNullable<BadgeProps["tone"]>, string> = {
  error: "bg-error",
  muted: "bg-muted-foreground/55",
  neutral: "bg-subtle-foreground/65",
  pending: "bg-warning",
  running: "bg-primary",
  success: "bg-success",
  unavailable: "bg-unavailable",
  warning: "bg-warning"
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1.5 rounded border px-1.5 text-[11px] font-medium uppercase tracking-normal",
        tones[tone],
        className
      )}
      {...props}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", markers[tone])} />
      {props.children}
    </span>
  );
}
