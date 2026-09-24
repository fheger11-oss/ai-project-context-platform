import { Injectable } from "@nestjs/common";

import type { IncrementalProcessingDecision } from "../../change-sets/application/incremental-processing-eligibility.service.js";
import { ChangeSetCompleteness, type ChangeSet } from "../../change-sets/domain/change-set.js";
import { RepositoryProcessingStrategy } from "./repository-processing-strategy.js";

@Injectable()
export class RepositoryProcessingStrategySelector {
  select(
    changeSet: ChangeSet | null | undefined,
    decision: IncrementalProcessingDecision
  ): RepositoryProcessingStrategy {
    return decision.eligible && changeSet?.completeness === ChangeSetCompleteness.COMPLETE
      ? RepositoryProcessingStrategy.INCREMENTAL
      : RepositoryProcessingStrategy.FULL;
  }
}
