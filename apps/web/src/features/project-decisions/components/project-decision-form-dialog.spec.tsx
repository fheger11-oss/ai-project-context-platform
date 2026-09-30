import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ProjectDecision } from "@ai-context/contracts";

import {
  ProjectDecisionFormDialog,
  projectDecisionFormValues
} from "@/features/project-decisions/components/project-decision-form-dialog";
import {
  projectDecisionFormInput,
  validateProjectDecisionForm
} from "@/features/project-decisions/components/project-decision-validation";

const decision: ProjectDecision = {
  id: "decision_1",
  repositoryId: "repository_1",
  title: "Database",
  decision: "Use managed Postgres.",
  rationale: "Reduce operational overhead.",
  affectedArea: "Infrastructure",
  status: "ACTIVE",
  decidedAt: "2026-09-30T10:30:00.000Z",
  sourceProjectContextId: null,
  sourceRepositoryUpdateId: null,
  sourceCommitSha: null,
  createdAt: "2026-09-30T10:31:00.000Z",
  updatedAt: "2026-09-30T10:31:00.000Z"
};

describe("ProjectDecisionFormDialog", () => {
  it("renders an empty create form", () => {
    const markup = renderToStaticMarkup(
      <ProjectDecisionFormDialog isPending={false} onClose={vi.fn()} onSubmit={vi.fn()} open />
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain("Record a decision");
    expect(markup).toContain('type="datetime-local"');
    expect(markup).toContain("Create decision");
  });

  it("initializes edit fields including the local decidedAt value", () => {
    const values = projectDecisionFormValues(decision);
    const markup = renderToStaticMarkup(
      <ProjectDecisionFormDialog
        decision={decision}
        isPending={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        open
      />
    );

    expect(markup).toContain("Edit decision");
    expect(markup).toContain('value="Database"');
    expect(markup).toContain("Use managed Postgres.");
    expect(markup).toContain(`value="${values.decidedAt}"`);
    expect(markup).toContain("Save corrections");
  });

  it("builds edit input with the corrected decidedAt value", () => {
    const values = {
      ...projectDecisionFormValues(decision),
      decidedAt: "2026-09-29T08:15"
    };

    expect(projectDecisionFormInput(values)).toMatchObject({
      title: decision.title,
      decidedAt: new Date("2026-09-29T08:15").toISOString()
    });
  });

  it("does not mutate entered values when validation fails", () => {
    const values = { ...projectDecisionFormValues(decision), title: "   " };
    const before = { ...values };

    expect(validateProjectDecisionForm(values).title).toBe("Title is required.");
    expect(values).toEqual(before);
  });

  it("disables dismissal and submission controls while pending", () => {
    const markup = renderToStaticMarkup(
      <ProjectDecisionFormDialog
        decision={decision}
        isPending
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        open
      />
    );

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain("Saving");
    expect(markup.match(/disabled/g)?.length).toBeGreaterThanOrEqual(7);
  });

  it("preserves the API error presentation and renders nothing when closed", () => {
    const errorMarkup = renderToStaticMarkup(
      <ProjectDecisionFormDialog
        error={{ title: "Request couldn't be completed", message: "Please try again." }}
        isPending={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        open
      />
    );
    const closedMarkup = renderToStaticMarkup(
      <ProjectDecisionFormDialog
        isPending={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        open={false}
      />
    );

    expect(errorMarkup).toContain("Request couldn&#x27;t be completed");
    expect(closedMarkup).toBe("");
  });
});
