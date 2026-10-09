import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { registerModal } from "@/components/ui/modal-manager";
import { cn } from "@/lib/utils";

type ModalProps = {
  ariaDescribedBy: string;
  ariaLabelledBy: string;
  children: ReactNode;
  className?: string;
  dismissible?: boolean;
  onDismiss: () => void;
};

export function Modal({
  ariaDescribedBy,
  ariaLabelledBy,
  children,
  className,
  dismissible = true,
  onDismiss
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const dismissibleRef = useRef(dismissible);
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    dismissibleRef.current = dismissible;
    onDismissRef.current = onDismiss;
  }, [dismissible, onDismiss]);

  useEffect(() => {
    const overlay = overlayRef.current;
    const dialog = dialogRef.current;
    if (!overlay || !dialog) return undefined;

    return registerModal(document, overlay, dialog, {
      canDismiss: () => dismissibleRef.current,
      onDismiss: () => onDismissRef.current()
    });
  }, []);

  const content = (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[70] grid place-items-center bg-background/72 p-3 backdrop-blur-sm sm:p-6"
      data-modal-overlay="true"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && dismissible) onDismiss();
      }}
    >
      <section
        ref={dialogRef}
        aria-describedby={ariaDescribedBy}
        aria-labelledby={ariaLabelledBy}
        aria-modal="true"
        className={cn(
          "max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto overscroll-y-contain rounded-md border border-border bg-surface p-4 shadow-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:max-h-[calc(100dvh-3rem)] sm:p-5",
          className
        )}
        role="dialog"
        tabIndex={-1}
      >
        {children}
      </section>
    </div>
  );

  return typeof document === "undefined" ? content : createPortal(content, document.body);
}
