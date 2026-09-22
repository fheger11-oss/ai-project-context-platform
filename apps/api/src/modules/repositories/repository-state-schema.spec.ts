import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");

describe("RepositoryState schema foundation", () => {
  it("defines the minimal V2 freshness states with UNKNOWN as the safe initial state", () => {
    expect(schema).toMatch(
      /enum RepositoryFreshnessStatus \{[\s\S]*UNKNOWN[\s\S]*FRESH[\s\S]*STALE[\s\S]*UPDATE_FAILED[\s\S]*\}/
    );
    expect(schema).toMatch(
      /freshnessStatus\s+RepositoryFreshnessStatus\s+@default\(UNKNOWN\)\s+@map\("freshness_status"\)/
    );
  });

  it("allows nullable commit state until remote repository state is known", () => {
    expect(schema).toMatch(/remoteHeadCommitSha\s+String\?\s+@map\("remote_head_commit_sha"\)/);
    expect(schema).toMatch(/remoteHeadCheckedAt\s+DateTime\?\s+@map\("remote_head_checked_at"\)/);
    expect(schema).toMatch(/lastScannedCommitSha\s+String\?\s+@map\("last_scanned_commit_sha"\)/);
    expect(schema).toMatch(/lastAnalyzedCommitSha\s+String\?\s+@map\("last_analyzed_commit_sha"\)/);
    expect(schema).toMatch(
      /currentContextCommitSha\s+String\?\s+@map\("current_context_commit_sha"\)/
    );
    expect(schema).toMatch(/lastUpdateStatus\s+String\?\s+@map\("last_update_status"\)/);
  });

  it("keeps one optional state record per Repository", () => {
    expect(schema).toMatch(/model Repository \{[\s\S]*state\s+RepositoryState\?/);
    expect(schema).toMatch(/repositoryId\s+String\s+@unique\s+@map\("repository_id"\)/);
    expect(schema).toMatch(
      /repository\s+Repository\s+@relation\(fields: \[repositoryId\], references: \[id\], onDelete: Cascade\)/
    );
  });

  it("can point at a current ProjectContext without requiring one", () => {
    expect(schema).toMatch(
      /currentProjectContextId\s+String\?\s+@unique\s+@map\("current_project_context_id"\)/
    );
    expect(schema).toMatch(
      /currentProjectContext\s+ProjectContext\?\s+@relation\("RepositoryStateCurrentProjectContext", fields: \[currentProjectContextId\], references: \[id\], onDelete: SetNull\)/
    );
    expect(schema).toMatch(
      /currentForRepositoryStates\s+RepositoryState\[\]\s+@relation\("RepositoryStateCurrentProjectContext"\)/
    );
  });
});
