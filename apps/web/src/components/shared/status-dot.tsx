import { cn } from "@/lib/utils";

type StatusDotProps = {
  active?: boolean;
  className?: string;
  tone?: "error" | "muted" | "pending" | "running" | "success" | "unavailable" | "warning";
};

const toneClasses: Record<NonNullable<StatusDotProps["tone"]>, string> = {
  error: "bg-error",
  muted: "bg-muted-foreground/45",
  pending: "bg-warning",
  running: "bg-primary",
  success: "bg-success",
  unavailable: "bg-unavailable",
  warning: "bg-warning"
};

export function StatusDot({ active = false, className, tone }: StatusDotProps) {
  const resolvedTone = tone ?? (active ? "success" : "muted");

  return (
    <span
      className={cn(
        "size-2 rounded-full",
        toneClasses[resolvedTone],
        active && "shadow-[0_0_14px_currentColor]",
        className
      )}
    />
  );
}
