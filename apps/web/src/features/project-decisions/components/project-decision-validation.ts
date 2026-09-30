import type { CreateProjectDecisionRequest } from "@ai-context/contracts";

export const PROJECT_DECISION_TITLE_MAX_LENGTH = 200;
export const PROJECT_DECISION_TEXT_MAX_LENGTH = 20_000;
export const PROJECT_DECISION_AFFECTED_AREA_MAX_LENGTH = 120;

export type ProjectDecisionFormValues = {
  title: string;
  decision: string;
  rationale: string;
  affectedArea: string;
  decidedAt: string;
};

export type ProjectDecisionFormErrors = Partial<Record<keyof ProjectDecisionFormValues, string>>;

export const emptyProjectDecisionFormValues: ProjectDecisionFormValues = {
  title: "",
  decision: "",
  rationale: "",
  affectedArea: "",
  decidedAt: ""
};

export function normalizeProjectDecisionFormValues(
  values: ProjectDecisionFormValues
): ProjectDecisionFormValues {
  return {
    title: values.title.trim(),
    decision: values.decision.trim(),
    rationale: values.rationale.trim(),
    affectedArea: values.affectedArea.trim(),
    decidedAt: values.decidedAt.trim()
  };
}

export function validateProjectDecisionForm(
  values: ProjectDecisionFormValues
): ProjectDecisionFormErrors {
  const normalized = normalizeProjectDecisionFormValues(values);
  const errors: ProjectDecisionFormErrors = {};

  validateRequiredText(
    normalized.title,
    "Title",
    PROJECT_DECISION_TITLE_MAX_LENGTH,
    "title",
    errors
  );
  validateRequiredText(
    normalized.decision,
    "Decision",
    PROJECT_DECISION_TEXT_MAX_LENGTH,
    "decision",
    errors
  );
  validateRequiredText(
    normalized.rationale,
    "Rationale",
    PROJECT_DECISION_TEXT_MAX_LENGTH,
    "rationale",
    errors
  );
  validateRequiredText(
    normalized.affectedArea,
    "Affected area",
    PROJECT_DECISION_AFFECTED_AREA_MAX_LENGTH,
    "affectedArea",
    errors
  );

  if (!normalized.decidedAt) {
    errors.decidedAt = "Decided at is required.";
  } else if (!dateTimeLocalToIso(normalized.decidedAt)) {
    errors.decidedAt = "Decided at must be a valid date and time.";
  }

  return errors;
}

export function projectDecisionFormInput(
  values: ProjectDecisionFormValues
): CreateProjectDecisionRequest | null {
  const normalized = normalizeProjectDecisionFormValues(values);
  if (Object.keys(validateProjectDecisionForm(normalized)).length > 0) return null;

  const decidedAt = dateTimeLocalToIso(normalized.decidedAt);
  if (!decidedAt) return null;

  return {
    title: normalized.title,
    decision: normalized.decision,
    rationale: normalized.rationale,
    affectedArea: normalized.affectedArea,
    decidedAt
  };
}

export function isoToDateTimeLocal(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
    ":",
    pad(date.getSeconds()),
    ".",
    String(date.getMilliseconds()).padStart(3, "0")
  ].join("");
}

export function dateTimeLocalToIso(value: string): string | null {
  const normalized = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(
    normalized
  );

  if (!match) {
    return null;
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;

  const [, year, month, day, hour, minute, second = "0", fraction = "0"] = match;
  const millisecond = Number(fraction.padEnd(3, "0"));
  const isExactLocalTime =
    date.getFullYear() === Number(year) &&
    date.getMonth() + 1 === Number(month) &&
    date.getDate() === Number(day) &&
    date.getHours() === Number(hour) &&
    date.getMinutes() === Number(minute) &&
    date.getSeconds() === Number(second) &&
    date.getMilliseconds() === millisecond;

  return isExactLocalTime ? date.toISOString() : null;
}

function validateRequiredText(
  value: string,
  label: string,
  maxLength: number,
  field: keyof ProjectDecisionFormValues,
  errors: ProjectDecisionFormErrors
) {
  if (!value) {
    errors[field] = `${label} is required.`;
  } else if (value.length > maxLength) {
    errors[field] = `${label} must be ${maxLength.toLocaleString()} characters or fewer.`;
  }
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
