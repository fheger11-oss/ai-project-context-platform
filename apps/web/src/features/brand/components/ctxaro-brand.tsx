import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type CtxaroMarkProps = ComponentPropsWithoutRef<"svg"> & {
  title?: string;
};

export function CtxaroMark({ className, title, ...props }: CtxaroMarkProps) {
  return (
    <svg
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={cn("shrink-0", className)}
      fill="none"
      role={title ? "img" : undefined}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M16 4.5 25.5 10v12L16 27.5 6.5 22V10L16 4.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      <path
        d="M16 10.5 21 13.35v5.3l-5 2.85-5-2.85v-5.3l5-2.85Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.1"
      />
      <path
        d="M6.5 10 11 13.35M25.5 10 21 13.35M16 21.5v6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.1"
      />
      <circle cx="16" cy="4.5" fill="currentColor" r="1.7" />
      <circle cx="6.5" cy="22" fill="currentColor" r="1.7" />
      <circle cx="25.5" cy="22" fill="currentColor" r="1.7" />
    </svg>
  );
}

type CtxaroWordmarkProps = {
  className?: string;
  markClassName?: string;
  collapsed?: boolean;
};

export function CtxaroWordmark({ className, collapsed, markClassName }: CtxaroWordmarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span className="grid size-8 place-items-center rounded-md border border-primary/25 bg-primary/10 text-primary shadow-[0_0_30px_rgba(69,211,154,0.12)]">
        <CtxaroMark className={cn("size-5", markClassName)} />
      </span>
      <span
        className={cn(
          "text-sm font-semibold lowercase tracking-normal text-white",
          collapsed && "sr-only"
        )}
      >
        ctxaro
      </span>
    </span>
  );
}
