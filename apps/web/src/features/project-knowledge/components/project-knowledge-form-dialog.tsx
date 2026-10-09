import { Loader2, Save, X } from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";
import type { ProjectKnowledge } from "@ai-context/contracts";
import { ErrorNotice } from "@/components/shared/error-notice";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { UserFacingError } from "@/lib/api-error";

export function ProjectKnowledgeFormDialog({
  item,
  open,
  isPending,
  error,
  onClose,
  onSubmit
}: {
  item?: ProjectKnowledge | null;
  open: boolean;
  isPending: boolean;
  error?: UserFacingError | null;
  onClose: () => void;
  onSubmit: (content: string) => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const [content, setContent] = useState(item?.content ?? "");
  const [validation, setValidation] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isPending, onClose, open]);
  if (!open) return null;
  function submit(event: FormEvent) {
    event.preventDefault();
    const value = content.trim();
    if (!value) return setValidation("Knowledge is required.");
    if (value.length > 20_000)
      return setValidation("Knowledge must be 20,000 characters or fewer.");
    onSubmit(value);
  }
  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-background/72 p-3 backdrop-blur-sm sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto overscroll-y-contain rounded-md border border-border bg-surface p-4 shadow-xl sm:max-h-[calc(100dvh-3rem)] sm:p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold">
              {item ? "Edit knowledge" : "Add project knowledge"}
            </h2>
            <p id={descriptionId} className="mt-1 text-sm leading-6 text-muted-foreground">
              Record a durable project fact explicitly provided by you.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Cancel"
            disabled={isPending}
            onClick={onClose}
          >
            <X />
          </Button>
        </div>
        <form className="mt-5 grid min-w-0 gap-4" onSubmit={submit}>
          {error ? <ErrorNotice error={error} /> : null}
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="project-knowledge-content">Knowledge</Label>
            <Textarea
              id="project-knowledge-content"
              value={content}
              maxLength={20_000}
              disabled={isPending}
              aria-invalid={Boolean(validation)}
              onChange={(event) => {
                setContent(event.target.value);
                setValidation(null);
              }}
            />
            {validation ? <p className="text-sm text-destructive">{validation}</p> : null}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={isPending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : <Save />}
              {isPending ? "Saving" : "Save knowledge"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
