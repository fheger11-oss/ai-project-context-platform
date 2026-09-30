import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ProjectDecision database definition", () => {
  it("defines lifecycle defaults, stable indexes, and repository-scoped provenance constraints", () => {
    const schema = readFileSync(
      new URL("../../../../prisma/schema.prisma", import.meta.url),
      "utf8"
    );
    const migration = readFileSync(
      new URL(
        "../../../../prisma/migrations/20260930120000_project_decisions/migration.sql",
        import.meta.url
      ),
      "utf8"
    );

    expect(schema).toContain("enum ProjectDecisionStatus");
    expect(schema).toContain("status                   ProjectDecisionStatus @default(ACTIVE)");
    expect(schema).toContain("@@index([repositoryId, status, decidedAt, id])");
    expect(schema).toContain("@@unique([id, repositoryId])");
    expect(migration).toContain('FOREIGN KEY ("source_project_context_id", "repository_id")');
    expect(migration).toContain('FOREIGN KEY ("source_repository_update_id", "repository_id")');
    expect(migration).toContain("ON DELETE RESTRICT");
    expect(migration).toContain(
      'FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE'
    );
  });
});
