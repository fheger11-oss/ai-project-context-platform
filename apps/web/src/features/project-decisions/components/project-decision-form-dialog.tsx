import { Loader2, Save, X } from "lucide-react";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import type { CreateProjectDecisionRequest, ProjectDecision } from "@ai-context/contracts";

import { ErrorNotice } from "@/components/shared/error-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import {
  emptyProjectDecisionFormValues,
  isoToDateTimeLocal,
  normalizeProjectDecisionFormValues,
  PROJECT_DECISION_AFFECTED_AREA_MAX_LENGTH,
  PROJECT_DECISION_TEXT_MAX_LENGTH,
  PROJECT_DECISION_TITLE_MAX_LENGTH,
  projectDecisionFormInput,
  type ProjectDecisionFormErrors,
  type ProjectDecisionFormValues,
  validateProjectDecisionForm
} from "@/features/project-decisions/components/project-decision-validation";
import type { UserFacingError } from "@/lib/api-error";

type ProjectDecisionFormDialogProps = {
  decision?: ProjectDecision | null;
  error?: UserFacingError | null;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (input: CreateProjectDecisionRequest) => void;
  open: boolean;
};

// Exported for focused initialization tests while remaining local to this feature.
// eslint-disable-next-line react-refresh/only-export-components
export function projectDecisionFormValues(
  decision?: ProjectDecision | null
): ProjectDecisionFormValues {
  if (!decision) return { ...emptyProjectDecisionFormValues };

  return {
    title: decision.title,
    decision: decision.decision,
    rationale: decision.rationale,
    affectedArea: decision.affectedArea,
    decidedAt: isoToDateTimeLocal(decision.decidedAt)
  };
}

export function ProjectDecisionFormDialog({
  decision,
  error,
  isPending,
  onClose,
  onSubmit,
  open
}: ProjectDecisionFormDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [values, setValues] = useState<ProjectDecisionFormValues>(() =>
    projectDecisionFormValues(decision)
  );
  const [errors, setErrors] = useState<ProjectDecisionFormErrors>({});
  const isEditing = Boolean(decision);

  if (!open) return null;

  function updateField(field: keyof ProjectDecisionFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    const normalized = normalizeProjectDecisionFormValues(values);
    const nextErrors = validateProjectDecisionForm(normalized);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    const input = projectDecisionFormInput(normalized);
    if (input) onSubmit(input);
  }

  return (
    <Modal
      ariaDescribedBy={descriptionId}
      ariaLabelledBy={titleId}
      className="max-w-2xl"
      dismissible={!isPending}
      onDismiss={onClose}
    >
      <>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold">
              {isEditing ? "Edit decision" : "Record a decision"}
            </h2>
            <p id={descriptionId} className="mt-1 text-sm leading-6 text-muted-foreground">
              {isEditing
                ? "Correct this record without replacing its historical meaning. Create a new decision for a materially different choice."
                : "Capture an explicit technical, product, or architectural choice and why it was made."}
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

        <form className="mt-5 grid min-w-0 gap-4" onSubmit={handleSubmit}>
          {error ? <ErrorNotice error={error} /> : null}

          <FormField label="Title" error={errors.title} htmlFor="project-decision-title">
            <Input
              id="project-decision-title"
              value={values.title}
              maxLength={PROJECT_DECISION_TITLE_MAX_LENGTH}
              aria-invalid={Boolean(errors.title)}
              disabled={isPending}
              onChange={(event) => updateField("title", event.target.value)}
            />
          </FormField>

          <FormField label="Decision" error={errors.decision} htmlFor="project-decision-decision">
            <Textarea
              id="project-decision-decision"
              value={values.decision}
              maxLength={PROJECT_DECISION_TEXT_MAX_LENGTH}
              aria-invalid={Boolean(errors.decision)}
              disabled={isPending}
              onChange={(event) => updateField("decision", event.target.value)}
            />
          </FormField>

          <FormField
            label="Rationale"
            error={errors.rationale}
            htmlFor="project-decision-rationale"
          >
            <Textarea
              id="project-decision-rationale"
              value={values.rationale}
              maxLength={PROJECT_DECISION_TEXT_MAX_LENGTH}
              aria-invalid={Boolean(errors.rationale)}
              disabled={isPending}
              onChange={(event) => updateField("rationale", event.target.value)}
            />
          </FormField>

          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <FormField
              label="Affected area"
              error={errors.affectedArea}
              htmlFor="project-decision-affected-area"
            >
              <Input
                id="project-decision-affected-area"
                value={values.affectedArea}
                maxLength={PROJECT_DECISION_AFFECTED_AREA_MAX_LENGTH}
                aria-invalid={Boolean(errors.affectedArea)}
                disabled={isPending}
                onChange={(event) => updateField("affectedArea", event.target.value)}
              />
            </FormField>

            <FormField
              label="Decided at"
              error={errors.decidedAt}
              htmlFor="project-decision-decided-at"
            >
              <Input
                id="project-decision-decided-at"
                type="datetime-local"
                step="0.001"
                value={values.decidedAt}
                aria-invalid={Boolean(errors.decidedAt)}
                disabled={isPending}
                onChange={(event) => updateField("decidedAt", event.target.value)}
              />
            </FormField>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={isPending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto"
              aria-busy={isPending}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="animate-spin" /> : <Save />}
              {isPending ? "Saving" : isEditing ? "Save corrections" : "Create decision"}
            </Button>
          </div>
        </form>
      </>
    </Modal>
  );
}

function FormField({
  children,
  error,
  htmlFor,
  label
}: {
  children: ReactNode;
  error?: string | undefined;
  htmlFor: string;
  label: string;
}) {
  return (
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
