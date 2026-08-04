import { cn } from "@/lib/utils";

type StatusDotProps = {
  active?: boolean;
  className?: string;
};

export function StatusDot({ active = false, className }: StatusDotProps) {
  return (
    <span
      className={cn(
        "size-2 rounded-full",
        active ? "bg-primary shadow-[0_0_16px_var(--primary)]" : "bg-muted-foreground/45",
        className
      )}
    />
  );
}
