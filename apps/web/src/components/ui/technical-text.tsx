import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type TechnicalTextProps = HTMLAttributes<HTMLElement> & {
  as?: "code" | "span";
  breakAnywhere?: boolean;
};

export function TechnicalText({
  as: Component = "span",
  breakAnywhere = false,
  className,
  ...props
}: TechnicalTextProps) {
  return (
    <Component
      className={cn(
        "min-w-0 whitespace-normal font-mono text-xs",
        breakAnywhere ? "break-all" : "break-words [overflow-wrap:anywhere]",
        className
      )}
      {...props}
    />
  );
}
