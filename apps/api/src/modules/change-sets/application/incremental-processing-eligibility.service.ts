import { Injectable } from "@nestjs/common";

import { ChangeSetCompleteness, type ChangeSet } from "../domain/change-set.js";

export type IncrementalProcessingDecision =
  | { eligible: true; reason: "COMPLETE_CHANGE_SET" }
  | {
      eligible: false;
      reason: "NO_CHANGE_SET" | "INCOMPLETE_CHANGE_SET";
    };

@Injectable()
export class IncrementalProcessingEligibilityService {
  evaluate(changeSet: ChangeSet | null | undefined): IncrementalProcessingDecision {
    if (!changeSet) {
      return { eligible: false, reason: "NO_CHANGE_SET" };
    }

    if (changeSet.completeness === ChangeSetCompleteness.INCOMPLETE) {
      return { eligible: false, reason: "INCOMPLETE_CHANGE_SET" };
    }

    return { eligible: true, reason: "COMPLETE_CHANGE_SET" };
  }
}
