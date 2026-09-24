import { describe, expect, it } from "vitest";

import {
  ChangeSetCompleteness,
  ComparisonStatus,
  type ChangeSet
} from "../../change-sets/domain/change-set.js";
import { RepositoryProcessingStrategy } from "./repository-processing-strategy.js";
import { RepositoryProcessingStrategySelector } from "./repository-processing-strategy.selector.js";

const completeChangeSet: ChangeSet = {
  baseCommitSha: "base",
  targetCommitSha: "target",
  comparisonStatus: ComparisonStatus.AHEAD,
  completeness: ChangeSetCompleteness.COMPLETE,
  aheadBy: 1,
  behindBy: 0,
  changedFileCount: 0,
  additions: 0,
  deletions: 0,
  files: []
};

const incompleteChangeSet = {
  ...completeChangeSet,
  completeness: ChangeSetCompleteness.INCOMPLETE
};

describe("RepositoryProcessingStrategySelector", () => {
  const selector = new RepositoryProcessingStrategySelector();

  it("selects full processing when no ChangeSet is available", () => {
    expect(selector.select(null, { eligible: false, reason: "NO_CHANGE_SET" })).toBe(
      RepositoryProcessingStrategy.FULL
    );
  });

  it("selects full processing for an incomplete ChangeSet", () => {
    expect(
      selector.select(incompleteChangeSet, {
        eligible: false,
        reason: "INCOMPLETE_CHANGE_SET"
      })
    ).toBe(RepositoryProcessingStrategy.FULL);
  });

  it("selects incremental processing only for an eligible complete ChangeSet", () => {
    expect(
      selector.select(completeChangeSet, {
        eligible: true,
        reason: "COMPLETE_CHANGE_SET"
      })
    ).toBe(RepositoryProcessingStrategy.INCREMENTAL);
  });

  it("keeps full processing if the eligibility decision conflicts with completeness", () => {
    expect(
      selector.select(incompleteChangeSet, {
        eligible: true,
        reason: "COMPLETE_CHANGE_SET"
      })
    ).toBe(RepositoryProcessingStrategy.FULL);
  });
});
