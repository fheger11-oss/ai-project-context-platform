import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  emphasis?: "elevated" | "flat" | "primary" | "subtle";
};

const emphasisClasses: Record<NonNullable<CardProps["emphasis"]>, string> = {
  elevated: "border-border-strong bg-surface-elevated shadow-[var(--shadow-soft)]",
  flat: "border-border bg-transparent",
  primary: "border-primary/25 bg-primary/5",
  subtle: "border-border bg-card/70"
};

export function Card({ className, emphasis = "subtle", ...props }: CardProps) {
  return (
    <div
      className={cn("rounded-md border text-card-foreground", emphasisClasses[emphasis], className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-b px-4 py-3", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("text-sm font-medium leading-6 text-foreground", className)} {...props} />
  );
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 text-xs leading-5 text-muted-foreground", className)} {...props} />;
}
