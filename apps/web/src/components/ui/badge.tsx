import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "success" | "muted";
};

const tones: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "border-border bg-secondary text-secondary-foreground",
  success: "border-primary/30 bg-primary/10 text-primary",
  muted: "border-border bg-muted text-muted-foreground"
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded px-1.5 text-[11px] font-medium uppercase tracking-normal",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
