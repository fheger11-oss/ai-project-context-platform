import { Loader2, MessageSquare, Send, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type FeedbackType, submitFeedback } from "@/features/feedback/api/feedback-api";
import {
  FEEDBACK_MESSAGE_MAX_LENGTH,
  FEEDBACK_MESSAGE_MIN_LENGTH,
  getFeedbackValidationMessage
} from "@/features/feedback/components/feedback-validation";
import { analytics } from "@/lib/analytics";

const typeLabels: Record<FeedbackType, string> = {
  FEATURE_REQUEST: "Feature request",
  BUG: "Bug",
  CONFUSING: "Something was confusing",
  GENERAL: "General feedback"
};

type FeedbackDialogProps = {
  accessToken: string | null;
  open: boolean;
  page: string;
  onClose: () => void;
};

export function FeedbackDialog({ accessToken, open, page, onClose }: FeedbackDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [type, setType] = useState<FeedbackType>("FEATURE_REQUEST");
  const [message, setMessage] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const normalizedMessage = useMemo(() => message.trim(), [message]);
  const mutation = useMutation({
    mutationFn: () => {
      if (!accessToken) {
        throw new Error("Authentication required");
      }

      return submitFeedback(accessToken, {
        type,
        message: normalizedMessage,
        page
      });
    },
    onSuccess: () => {
      analytics.track("feedback_submitted", {
        type,
        page
      });
      setSubmitted(true);
      setMessage("");
      setClientError(null);
    },
    onError: () => {
      setClientError("Feedback could not be sent. Please try again.");
    }
  });

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !mutation.isPending) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mutation.isPending, onClose, open]);

  if (!open) {
    return null;
  }

  const validationError = getFeedbackValidationMessage(normalizedMessage);
  const error = clientError ?? validationError;

  function handleSubmit() {
    setSubmitted(false);
    setClientError(null);

    if (validationError || mutation.isPending) {
      setClientError(validationError);
      return;
    }

    mutation.mutate();
  }

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-background/72 px-4 py-6 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !mutation.isPending) {
          onClose();
        }
      }}
    >
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="w-full max-w-lg rounded-md border border-border bg-surface p-5 shadow-xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-3 grid size-10 place-items-center rounded-md border border-primary/20 bg-primary/10 text-primary">
              <MessageSquare className="size-5" />
            </div>
            <h2 id={titleId} className="text-lg font-semibold">
              Help us improve Ctxaro
            </h2>
            <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
              Tell us what you would improve, add, or change.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Cancel"
            disabled={mutation.isPending}
            onClick={onClose}
          >
            <X />
          </Button>
        </div>

        <div className="mt-5 grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="feedback-type">Feedback type</Label>
            <Select
              id="feedback-type"
              value={type}
              disabled={mutation.isPending}
              onChange={(event) => setType(event.target.value as FeedbackType)}
            >
              {Object.entries(typeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="feedback-message">Message</Label>
            <Textarea
              id="feedback-message"
              aria-invalid={Boolean(error)}
              maxLength={FEEDBACK_MESSAGE_MAX_LENGTH}
              placeholder="What would make Ctxaro more useful to you?"
              value={message}
              disabled={mutation.isPending}
              onChange={(event) => {
                setMessage(event.target.value);
                setClientError(null);
                setSubmitted(false);
              }}
            />
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                {normalizedMessage.length} / {FEEDBACK_MESSAGE_MAX_LENGTH}
              </span>
              <span>Minimum {FEEDBACK_MESSAGE_MIN_LENGTH} characters</span>
            </div>
          </div>

          <div className="min-h-5" aria-live="polite">
            {submitted ? (
              <p className="text-sm text-primary" role="status">
                Thanks. Your feedback was sent.
              </p>
            ) : null}
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={mutation.isPending} onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              aria-busy={mutation.isPending}
              disabled={mutation.isPending || !accessToken}
              onClick={handleSubmit}
            >
              {mutation.isPending ? <Loader2 className="animate-spin" /> : <Send />}
              {mutation.isPending ? "Sending" : "Send feedback"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
