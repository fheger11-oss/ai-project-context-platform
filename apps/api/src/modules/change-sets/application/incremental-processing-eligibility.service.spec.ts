import { describe, expect, it } from "vitest";

import {
  ChangeSetCompleteness,
  ComparisonStatus,
  FileChangeType,
  type ChangeSet
} from "../domain/change-set.js";
import { IncrementalProcessingEligibilityService } from "./incremental-processing-eligibility.service.js";

const completeChangeSet: ChangeSet = {
  baseCommitSha: "base",
  targetCommitSha: "target",
  comparisonStatus: ComparisonStatus.AHEAD,
  completeness: ChangeSetCompleteness.COMPLETE,
  aheadBy: 1,
  behindBy: 0,
  changedFileCount: 1,
  additions: 2,
  deletions: 0,
  files: [{ path: "src/file.ts", type: FileChangeType.ADDED, additions: 2, deletions: 0 }]
};

describe("IncrementalProcessingEligibilityService", () => {
  const service = new IncrementalProcessingEligibilityService();

  it.each([null, undefined])("rejects an absent ChangeSet as unavailable", (changeSet) => {
    expect(service.evaluate(changeSet)).toEqual({
      eligible: false,
      reason: "NO_CHANGE_SET"
    });
  });

  it("rejects an incomplete ChangeSet for incremental processing", () => {
    expect(
      service.evaluate({
        ...completeChangeSet,
        completeness: ChangeSetCompleteness.INCOMPLETE
      })
    ).toEqual({ eligible: false, reason: "INCOMPLETE_CHANGE_SET" });
  });

  it("allows a complete ChangeSet to be considered for incremental processing", () => {
    expect(service.evaluate(completeChangeSet)).toEqual({
      eligible: true,
      reason: "COMPLETE_CHANGE_SET"
    });
  });
});
