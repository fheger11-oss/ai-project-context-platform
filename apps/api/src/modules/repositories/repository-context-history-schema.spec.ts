import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");

describe("durable repository context history schema", () => {
  it("owns explicit repository context history records", () => {
    expect(schema).toMatch(/model RepositoryContextHistory \{/);
    expect(schema).toMatch(/repositoryId\s+String\s+@map\("repository_id"\)/);
    expect(schema).toMatch(/projectContextId\s+String\s+@map\("project_context_id"\)/);
    expect(schema).toMatch(/@@unique\(\[repositoryId, projectContextId\]\)/);
  });

  it("uses a composite repository/context foreign key to prevent cross-repository history", () => {
    expect(schema).toMatch(
      /projectContext\s+ProjectContext\s+@relation\("RepositoryContextHistoryProjectContext", fields: \[projectContextId, repositoryId\], references: \[id, repositoryId\], onDelete: Restrict\)/
    );
    expect(schema).toMatch(/@@unique\(\[id, repositoryId\]\)/);
  });

  it("preserves explicit current-context ownership and existing V1 cascades", () => {
    expect(schema).toMatch(
      /currentProjectContext\s+ProjectContext\?\s+@relation\("RepositoryStateCurrentProjectContext", fields: \[currentProjectContextId\], references: \[id\], onDelete: SetNull\)/
    );
    expect(schema).toMatch(
      /analysis\s+Analysis\s+@relation\(fields: \[analysisId\], references: \[id\], onDelete: Cascade\)/
    );
    expect(schema).toMatch(
      /scan\s+Scan\s+@relation\(fields: \[scanId\], references: \[id\], onDelete: Cascade\)/
    );
  });

  it("preserves repository cleanup and update-history semantics", () => {
    expect(schema).toMatch(
      /repository\s+Repository\s+@relation\(fields: \[repositoryId\], references: \[id\], onDelete: Cascade\)/
    );
    expect(schema).toMatch(
      /projectContext\s+ProjectContext\?\s+@relation\("RepositoryUpdateProjectContext", fields: \[projectContextId\], references: \[id\], onDelete: SetNull\)/
    );
  });
});
