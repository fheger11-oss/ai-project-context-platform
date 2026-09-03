import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");

describe("repository disconnect privacy cascade", () => {
  it("cascades repository-derived data without deleting the GitHub account connection", () => {
    expect(schema).toMatch(
      /model Scan \{[\s\S]*repository Repository @relation\(fields: \[repositoryId\], references: \[id\], onDelete: Cascade\)/
    );
    expect(schema).toMatch(
      /model ScanFile \{[\s\S]*scan Scan @relation\(fields: \[scanId\], references: \[id\], onDelete: Cascade\)/
    );
    expect(schema).toMatch(
      /model Analysis \{[\s\S]*repository Repository @relation\(fields: \[repositoryId\], references: \[id\], onDelete: Cascade\)/
    );
    expect(schema).toMatch(
      /model ProjectContext \{[\s\S]*repository Repository @relation\(fields: \[repositoryId\], references: \[id\], onDelete: Cascade\)/
    );
    expect(schema).toMatch(
      /model Document \{[\s\S]*projectContext ProjectContext @relation\(fields: \[projectContextId\], references: \[id\], onDelete: Cascade\)/
    );
    expect(schema).not.toMatch(
      /model Repository \{[\s\S]*githubAccount GitHubAccount @relation[\s\S]*onDelete: Cascade/
    );
  });
});
