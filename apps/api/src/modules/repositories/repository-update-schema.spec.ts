import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");

describe("RepositoryUpdate schema foundation", () => {
  it("defines the minimal repository update lifecycle status enum", () => {
    expect(schema).toMatch(
      /enum RepositoryUpdateStatus \{\s+PENDING\s+RUNNING\s+COMPLETED\s+FAILED\s+\}/
    );
    expect(schema).not.toMatch(/enum RepositoryUpdateStatus \{[\s\S]*CANCELLED/);
    expect(schema).not.toMatch(/enum RepositoryUpdateStatus \{[\s\S]*RETRYING/);
  });

  it("defines explicit trigger types without implementing trigger behavior", () => {
    expect(schema).toMatch(/enum RepositoryUpdateTriggerType \{\s+MANUAL\s+WEBHOOK\s+SYSTEM\s+\}/);
  });

  it("relates Repository to many RepositoryUpdate records", () => {
    expect(schema).toMatch(/model Repository \{[\s\S]*updates\s+RepositoryUpdate\[\]/);
    expect(schema).toMatch(
      /repository\s+Repository\s+@relation\(fields: \[repositoryId\], references: \[id\], onDelete: Cascade\)/
    );
  });

  it("requires repository, target commit, trigger type, and update status", () => {
    expect(schema).toMatch(/repositoryId\s+String\s+@map\("repository_id"\)/);
    expect(schema).toMatch(/triggerType\s+RepositoryUpdateTriggerType\s+@map\("trigger_type"\)/);
    expect(schema).toMatch(/targetCommitSha\s+String\s+@map\("target_commit_sha"\)/);
    expect(schema).toMatch(/status\s+RepositoryUpdateStatus\s+@default\(PENDING\)/);
  });

  it("keeps update lifecycle and downstream engine references nullable", () => {
    expect(schema).toMatch(/baseCommitSha\s+String\?\s+@map\("base_commit_sha"\)/);
    expect(schema).toMatch(/startedAt\s+DateTime\?\s+@map\("started_at"\)/);
    expect(schema).toMatch(/completedAt\s+DateTime\?\s+@map\("completed_at"\)/);
    expect(schema).toMatch(/failedAt\s+DateTime\?\s+@map\("failed_at"\)/);
    expect(schema).toMatch(/failureReason\s+String\?\s+@map\("failure_reason"\)/);
    expect(schema).toMatch(/scanId\s+String\?\s+@map\("scan_id"\)/);
    expect(schema).toMatch(/analysisId\s+String\?\s+@map\("analysis_id"\)/);
    expect(schema).toMatch(/projectContextId\s+String\?\s+@map\("project_context_id"\)/);
    expect(schema).toMatch(/changeSet\s+Json\?\s+@map\("change_set"\)/);
  });

  it("does not block V1 retention when linked Scan, Analysis, or ProjectContext rows are deleted", () => {
    expect(schema).toMatch(
      /scan\s+Scan\?\s+@relation\("RepositoryUpdateScan", fields: \[scanId\], references: \[id\], onDelete: SetNull\)/
    );
    expect(schema).toMatch(
      /analysis\s+Analysis\?\s+@relation\("RepositoryUpdateAnalysis", fields: \[analysisId\], references: \[id\], onDelete: SetNull\)/
    );
    expect(schema).toMatch(
      /projectContext\s+ProjectContext\?\s+@relation\("RepositoryUpdateProjectContext", fields: \[projectContextId\], references: \[id\], onDelete: SetNull\)/
    );
  });

  it("adds targeted update lookup indexes without target-commit uniqueness", () => {
    expect(schema).toMatch(/@@index\(\[repositoryId\]\)/);
    expect(schema).toMatch(/@@index\(\[repositoryId, status\]\)/);
    expect(schema).toMatch(/@@index\(\[repositoryId, targetCommitSha\]\)/);
    expect(schema).not.toMatch(/@@unique\(\[repositoryId, targetCommitSha\]\)/);
  });

  it("preserves existing V1 cascades and RepositoryState current-context ownership", () => {
    expect(schema).toMatch(
      /analysis\s+Analysis\s+@relation\(fields: \[analysisId\], references: \[id\], onDelete: Cascade\)/
    );
    expect(schema).toMatch(
      /scan\s+Scan\s+@relation\(fields: \[scanId\], references: \[id\], onDelete: Cascade\)/
    );
    expect(schema).toMatch(
      /currentProjectContext\s+ProjectContext\?\s+@relation\("RepositoryStateCurrentProjectContext", fields: \[currentProjectContextId\], references: \[id\], onDelete: SetNull\)/
    );
  });
});
