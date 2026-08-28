import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

type FaqItemProps = {
  answer: string;
  id: string;
  index: number;
  isOpen: boolean;
  question: string;
  onToggle: () => void;
};

export function FaqItem({ answer, id, index, isOpen, onToggle, question }: FaqItemProps) {
  const panelId = `${id}-panel`;

  return (
    <div className="border-b border-white/10 last:border-b-0">
      <button
        type="button"
        className="group flex w-full items-center gap-4 py-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/75 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08100e]"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className="font-mono text-xs text-primary">{String(index + 1).padStart(2, "0")}</span>
        <span className="min-w-0 flex-1 text-base font-medium text-white">{question}</span>
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.025] text-muted-foreground transition-transform group-hover:text-primary",
            isOpen && "rotate-45 border-primary/25 text-primary"
          )}
        >
          <Plus className="size-4" aria-hidden="true" />
        </span>
      </button>
      <div
        id={panelId}
        className={cn("landing-faq-panel grid", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
      >
        <div className="overflow-hidden">
          <p className="pb-5 pl-10 text-sm leading-7 text-muted-foreground sm:pl-14">{answer}</p>
        </div>
      </div>
    </div>
  );
}
