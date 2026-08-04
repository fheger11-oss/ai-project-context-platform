import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageHeadingProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageHeading({ eyebrow, title, description, actions, className }: PageHeadingProps) {
  return (
    <div
      className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}
    >
      <div className="max-w-3xl space-y-2">
        {eyebrow ? <p className="text-xs font-medium uppercase text-primary">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold tracking-normal text-foreground md:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="text-sm leading-6 text-muted-foreground md:text-base">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
