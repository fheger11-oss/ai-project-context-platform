import type { ButtonHTMLAttributes, HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function TabsList({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("inline-flex items-center gap-1 rounded-md border bg-surface p-1", className)}
      role="tablist"
      {...props}
    />
  );
}

type TabTriggerProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

export function TabTrigger({ active = false, className, ...props }: TabTriggerProps) {
  return (
    <button
      className={cn(
        "inline-flex h-8 items-center justify-center rounded-sm px-3 text-sm font-medium text-muted-foreground transition-[background-color,color,box-shadow] duration-150 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active && "bg-surface-elevated text-foreground shadow-[var(--shadow-control)]",
        className
      )}
      aria-selected={active}
      role="tab"
      type="button"
      {...props}
    />
  );
}

export function TabPanel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("outline-none focus-visible:ring-2 focus-visible:ring-ring/70", className)}
      role="tabpanel"
      {...props}
    />
  );
}
