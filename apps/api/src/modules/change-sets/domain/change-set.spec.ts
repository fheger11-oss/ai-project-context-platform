import { describe, expect, it } from "vitest";

import {
  ComparisonStatus,
  createChangeSet,
  createEmptyChangeSet,
  FileChangeType
} from "./change-set.js";

describe("ChangeSet", () => {
  it("represents supported file changes and derives summary counts", () => {
    const changeSet = createChangeSet({
      baseCommitSha: "base",
      targetCommitSha: "target",
      comparisonStatus: ComparisonStatus.AHEAD,
      aheadBy: 2,
      files: [
        { path: "added.ts", type: FileChangeType.ADDED, additions: 4, deletions: 0 },
        { path: "modified.ts", type: FileChangeType.MODIFIED, additions: 3, deletions: 2 },
        { path: "deleted.ts", type: FileChangeType.DELETED, additions: 0, deletions: 5 },
        {
          path: "renamed.ts",
          previousPath: "old.ts",
          type: FileChangeType.RENAMED,
          additions: 1,
          deletions: 1
        },
        {
          path: "copied.ts",
          previousPath: "source.ts",
          type: FileChangeType.COPIED,
          additions: 7,
          deletions: 0
        }
      ]
    });

    expect(changeSet).toMatchObject({
      changedFileCount: 5,
      additions: 15,
      deletions: 8,
      aheadBy: 2,
      behindBy: 0
    });
    expect(changeSet.files.map((file) => file.type)).toEqual([
      FileChangeType.ADDED,
      FileChangeType.MODIFIED,
      FileChangeType.DELETED,
      FileChangeType.RENAMED,
      FileChangeType.COPIED
    ]);
  });

  it("creates an empty identical ChangeSet", () => {
    expect(createEmptyChangeSet("same")).toEqual({
      baseCommitSha: "same",
      targetCommitSha: "same",
      comparisonStatus: ComparisonStatus.IDENTICAL,
      aheadBy: 0,
      behindBy: 0,
      changedFileCount: 0,
      additions: 0,
      deletions: 0,
      files: []
    });
  });
});
