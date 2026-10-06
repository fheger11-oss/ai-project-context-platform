import { describe, expect, it, vi } from "vitest";

import type { DependencyHistoryReader } from "../domain/contracts/dependency-history-reader.contract.js";
import type { DependencySnapshotReader } from "../domain/contracts/dependency-snapshot-reader.contract.js";
import type { DependencyDeclaration, DependencySnapshot } from "../domain/dependency-snapshot.js";
import { GetDependencyHistoryComparisonService } from "./get-dependency-history-comparison.service.js";

describe("GetDependencyHistoryComparisonService", () => {
  it("uses the immediately previous promoted context as the baseline", async () => {
    const { service, readPromoted } = harness([
      snapshot("older", divergent()),
      snapshot("previous", []),
      snapshot("current", divergent())
    ]);

    const result = await service.execute("repository-a");
    expect(result?.comparison.status).toBe("COMPARABLE");
    expect(result?.comparison.lifecycle[0]?.lifecycle).toBe("RECURRING");
    expect(readPromoted.mock.calls.map((call) => call[1])).toEqual([
      "context-previous",
      "context-older"
    ]);
  });

  it("stops at an incompatible immediate baseline and never searches backward", async () => {
    const { service, readPromoted } = harness([
      snapshot("older", divergent()),
      { ...snapshot("previous", []), analyzerVersion: "analyzer-2" },
      snapshot("current", divergent())
    ]);

    const result = await service.execute("repository-a");
    expect(result?.comparison.status).toBe("INCOMPATIBLE");
    expect(result?.comparison.lifecycle[0]?.lifecycle).toBe("NEW");
    expect(readPromoted).toHaveBeenCalledTimes(1);
    expect(readPromoted).toHaveBeenCalledWith("repository-a", "context-previous");
  });

  it("returns NO_BASELINE for the first promoted context", async () => {
    const { service, readPromoted } = harness([snapshot("current", divergent())]);
    const result = await service.execute("repository-a");
    expect(result?.comparison.status).toBe("NO_BASELINE");
    expect(result?.comparison.lifecycle[0]?.lifecycle).toBe("NEW");
    expect(readPromoted).not.toHaveBeenCalled();
  });

  it("keeps every historical read repository scoped", async () => {
    const { service, readCurrent, readPromoted, listThroughCurrent } = harness([
      snapshot("previous", []),
      snapshot("current", divergent())
    ]);
    await service.execute("repository-a");
    expect(readCurrent).toHaveBeenCalledWith("repository-a");
    expect(listThroughCurrent).toHaveBeenCalledWith("repository-a", "context-current");
    expect(readPromoted).toHaveBeenCalledWith("repository-a", "context-previous");
  });
});

function harness(snapshots: DependencySnapshot[]) {
  const current = snapshots.at(-1) ?? null;
  const readCurrent = vi.fn(async (_repositoryId: string) => current);
  const readPromoted = vi.fn(async (_repositoryId: string, contextId: string) => {
    const found = snapshots.find((item) => item.projectContextId === contextId);
    if (!found) throw new Error(`Missing fixture ${contextId}`);
    return found;
  });
  const listThroughCurrent = vi.fn(async (_repositoryId: string, _contextId: string) =>
    snapshots.map((item, index) => ({
      historyId: `history-${index}`,
      projectContextId: item.projectContextId,
      promotedAt: new Date(index)
    }))
  );
  return {
    service: new GetDependencyHistoryComparisonService(
      { readCurrent, readPromoted } satisfies DependencySnapshotReader,
      { listThroughCurrent } satisfies DependencyHistoryReader
    ),
    readCurrent,
    readPromoted,
    listThroughCurrent
  };
}

function snapshot(id: string, declarations: DependencyDeclaration[]): DependencySnapshot {
  return {
    repositoryId: "repository-a",
    projectContextId: `context-${id}`,
    analysisId: `analysis-${id}`,
    commitSha: `commit-${id}`,
    analyzerVersion: "analyzer-1",
    contextVersion: "context-1",
    declarations
  };
}

function divergent(): DependencyDeclaration[] {
  return [
    {
      packageName: "react",
      declaredVersion: "18",
      dependencyType: "DEPENDENCY",
      manifestPath: "package.json"
    },
    {
      packageName: "react",
      declaredVersion: "19",
      dependencyType: "DEPENDENCY",
      manifestPath: "apps/web/package.json"
    }
  ];
}
