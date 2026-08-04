import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function TextShimmer({ className, children, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "bg-[linear-gradient(110deg,var(--muted-foreground),var(--foreground),var(--primary),var(--muted-foreground))] bg-[length:220%_100%] bg-clip-text text-transparent motion-safe:animate-[text-shimmer_4s_linear_infinite]",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
