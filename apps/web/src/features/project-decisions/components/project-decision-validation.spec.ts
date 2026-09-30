import { describe, expect, it } from "vitest";

import {
  dateTimeLocalToIso,
  isoToDateTimeLocal,
  normalizeProjectDecisionFormValues,
  PROJECT_DECISION_AFFECTED_AREA_MAX_LENGTH,
  PROJECT_DECISION_TEXT_MAX_LENGTH,
  PROJECT_DECISION_TITLE_MAX_LENGTH,
  projectDecisionFormInput,
  validateProjectDecisionForm
} from "@/features/project-decisions/components/project-decision-validation";

const valid = {
  title: "Database",
  decision: "Use managed Postgres.",
  rationale: "Reduce operational overhead.",
  affectedArea: "Infrastructure",
  decidedAt: "2026-09-30T10:30"
};

describe("ProjectDecision form validation", () => {
  it("accepts a valid decision and trims its text fields", () => {
    expect(validateProjectDecisionForm(valid)).toEqual({});
    expect(
      normalizeProjectDecisionFormValues({
        ...valid,
        title: "  Database  ",
        decision: "  Use managed Postgres.  ",
        rationale: "  Reduce operational overhead.  ",
        affectedArea: "  Infrastructure  "
      })
    ).toEqual(valid);
  });

  it.each([
    ["title", "Title is required."],
    ["decision", "Decision is required."],
    ["rationale", "Rationale is required."],
    ["affectedArea", "Affected area is required."],
    ["decidedAt", "Decided at is required."]
  ] as const)("requires %s", (field, message) => {
    expect(validateProjectDecisionForm({ ...valid, [field]: "   " })[field]).toBe(message);
  });

  it("enforces every backend-aligned maximum length", () => {
    const errors = validateProjectDecisionForm({
      ...valid,
      title: "a".repeat(PROJECT_DECISION_TITLE_MAX_LENGTH + 1),
      decision: "a".repeat(PROJECT_DECISION_TEXT_MAX_LENGTH + 1),
      rationale: "a".repeat(PROJECT_DECISION_TEXT_MAX_LENGTH + 1),
      affectedArea: "a".repeat(PROJECT_DECISION_AFFECTED_AREA_MAX_LENGTH + 1)
    });

    expect(errors.title).toContain("200");
    expect(errors.decision).toContain("20,000");
    expect(errors.rationale).toContain("20,000");
    expect(errors.affectedArea).toContain("120");
  });

  it("rejects malformed and impossible dates", () => {
    expect(validateProjectDecisionForm({ ...valid, decidedAt: "not-a-date" }).decidedAt).toBe(
      "Decided at must be a valid date and time."
    );
    expect(dateTimeLocalToIso("2026-99-99T99:99")).toBeNull();
    expect(dateTimeLocalToIso("2026-02-30T10:30")).toBeNull();
  });

  it("converts an ISO instant into local datetime input values and back to the same instant", () => {
    const iso = "2026-09-30T10:30:00.000Z";
    const local = isoToDateTimeLocal(iso);

    expect(local).toMatch(/^2026-09-30T\d{2}:\d{2}:00\.000$/);
    expect(dateTimeLocalToIso(local)).toBe(iso);
  });

  it("returns safe empty/null values for invalid date conversion inputs", () => {
    expect(isoToDateTimeLocal("invalid")).toBe("");
    expect(dateTimeLocalToIso("invalid")).toBeNull();
  });

  it("builds the trimmed API input and preserves decidedAt as an ISO correction", () => {
    const input = projectDecisionFormInput({ ...valid, title: "  Database  " });

    expect(input).toEqual({
      title: "Database",
      decision: valid.decision,
      rationale: valid.rationale,
      affectedArea: valid.affectedArea,
      decidedAt: dateTimeLocalToIso(valid.decidedAt)
    });
  });
});
