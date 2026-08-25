import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium shadow-[var(--shadow-control)] transition-[background-color,border-color,color,box-shadow,transform] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring/75 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-primary/30 bg-primary text-primary-foreground hover:bg-primary/92 hover:shadow-[0_0_0_1px_oklch(0.77_0.145_170_/_18%),var(--shadow-control)] active:translate-y-px",
        secondary:
          "border border-border bg-secondary text-secondary-foreground hover:border-border-strong hover:bg-secondary/82 active:translate-y-px",
        ghost: "shadow-none hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
        outline:
          "border border-border bg-surface text-subtle-foreground hover:border-border-strong hover:bg-surface-elevated hover:text-foreground active:translate-y-px",
        utility:
          "border border-transparent bg-transparent text-muted-foreground shadow-none hover:bg-accent hover:text-foreground active:bg-accent/80",
        destructive:
          "border border-destructive/35 bg-destructive text-error-foreground hover:bg-destructive/90 active:translate-y-px"
      },
      size: {
        sm: "h-8 px-2.5 text-xs",
        md: "h-9 px-3",
        lg: "h-10 px-4",
        icon: "size-9 p-0"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, ...props },
  ref
) {
  const Comp = asChild ? Slot : "button";

  return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});

export { buttonVariants };
