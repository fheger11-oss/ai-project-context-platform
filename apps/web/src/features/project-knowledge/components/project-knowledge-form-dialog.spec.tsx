import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ProjectKnowledgeFormDialog } from "./project-knowledge-form-dialog";

describe("ProjectKnowledgeFormDialog", () => {
  it("initializes create and edit forms and protects pending actions", () => {
    const create = renderToStaticMarkup(
      <ProjectKnowledgeFormDialog open isPending={false} onClose={vi.fn()} onSubmit={vi.fn()} />
    );
    const edit = renderToStaticMarkup(
      <ProjectKnowledgeFormDialog
        open
        isPending
        item={{
          id: "k1",
          repositoryId: "r1",
          content: "Durable fact",
          status: "ACTIVE",
          origin: "USER_AUTHORED",
          kind: "USER_ASSERTED",
          sourceType: "USER",
          confidence: null,
          sourceProjectContextId: null,
          sourceProjectDecisionId: null,
          verifiedAt: null,
          createdAt: "2026-10-01T00:00:00.000Z",
          updatedAt: "2026-10-01T00:00:00.000Z"
        }}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    expect(create).toContain("Add project knowledge");
    expect(edit).toContain("Edit knowledge");
    expect(edit).toContain("Durable fact");
    expect(edit).toContain("disabled");
  });
});
