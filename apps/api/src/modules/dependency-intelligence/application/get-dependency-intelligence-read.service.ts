import { Inject, Injectable } from "@nestjs/common";
import type {
  DependencyDeclarationChangeItem,
  DependencyFindingItem,
  DependencyIntelligenceHistoryResponse,
  DependencyIntelligenceResponse,
  DependencyProvenance
} from "@ai-context/contracts";

import { RepositoriesService } from "../../repositories/repositories.service.js";
import type { DependencyFindingTransition } from "../domain/dependency-history-comparison.js";
import type { DependencySnapshot } from "../domain/dependency-snapshot.js";
import { DEPENDENCY_PROCESSOR_VERSION } from "../domain/dependency-rule-version.js";
import { GetDependencyHistoryComparisonService } from "./get-dependency-history-comparison.service.js";

export type DependencyIntelligencePageQuery = {
  userId: string;
  repositoryId: string;
  page: number;
  pageSize: number;
  findingPage: number;
  findingPageSize: number;
};

@Injectable()
export class GetDependencyIntelligenceReadService {
  constructor(
    @Inject(GetDependencyHistoryComparisonService)
    private readonly intelligence: GetDependencyHistoryComparisonService,
    @Inject(RepositoriesService) private readonly repositories: RepositoriesService
  ) {}

  async getCurrent(
    query: DependencyIntelligencePageQuery
  ): Promise<DependencyIntelligenceResponse> {
    const result = await this.readAuthorized(query);
    if (!result) return emptyCurrent(query);
    const transitions = result.comparison.lifecycle.map(toFindingItem);
    const currentFindings = transitions.filter((item) => item.lifecycle !== "RESOLVED");
    return {
      available: true,
      provenance: provenance(result.snapshot),
      compatibility: result.comparison.status,
      summary: {
        declarationCount: result.snapshot.declarations.length,
        distinctPackageCount: new Set(result.snapshot.declarations.map((item) => item.packageName))
          .size,
        divergenceFindingCount: currentFindings.length
      },
      declarations: page(result.snapshot.declarations, query.page, query.pageSize),
      findings: page(currentFindings, query.findingPage, query.findingPageSize)
    };
  }

  async getHistory(
    query: DependencyIntelligencePageQuery
  ): Promise<DependencyIntelligenceHistoryResponse> {
    const result = await this.readAuthorized(query);
    if (!result) return emptyHistory(query);
    const findings = result.comparison.lifecycle.map(toFindingItem);
    const changes = result.comparison.declarationChanges.map(
      (item): DependencyDeclarationChangeItem => ({ ...item })
    );
    return {
      available: true,
      compatibility: result.comparison.status,
      current: provenance(result.snapshot),
      previous: result.previousSnapshot ? provenance(result.previousSnapshot) : null,
      lifecycleCounts: {
        new: count(findings, "NEW"),
        persisting: count(findings, "PERSISTING"),
        resolved: count(findings, "RESOLVED"),
        recurring: count(findings, "RECURRING")
      },
      changeCounts: {
        added: changes.filter((item) => item.type === "ADDED").length,
        removed: changes.filter((item) => item.type === "REMOVED").length,
        versionChanged: changes.filter((item) => item.type === "VERSION_CHANGED").length,
        dependencyTypeChanged: changes.filter((item) => item.type === "DEPENDENCY_TYPE_CHANGED")
          .length
      },
      findings: page(findings, query.findingPage, query.findingPageSize),
      changes: page(changes, query.page, query.pageSize)
    };
  }

  private async readAuthorized(query: DependencyIntelligencePageQuery) {
    await this.repositories.getScanAccessMetadataForUser(query.userId, query.repositoryId);
    return this.intelligence.execute(query.repositoryId);
  }
}

function provenance(snapshot: DependencySnapshot): DependencyProvenance {
  return {
    repositoryId: snapshot.repositoryId,
    projectContextId: snapshot.projectContextId,
    analysisId: snapshot.analysisId,
    commitSha: snapshot.commitSha,
    analyzerVersion: snapshot.analyzerVersion,
    contextVersion: snapshot.contextVersion,
    dependencyProcessorVersion: DEPENDENCY_PROCESSOR_VERSION
  };
}

function toFindingItem(transition: DependencyFindingTransition): DependencyFindingItem {
  const finding = transition.currentFinding ?? transition.previousFinding;
  if (!finding) throw new Error(`Dependency finding ${transition.fingerprint} has no evidence.`);
  return {
    ruleId: finding.ruleId,
    ruleVersion: finding.ruleVersion,
    fingerprint: finding.fingerprint,
    packageName: finding.packageName,
    lifecycle: transition.lifecycle,
    projectContextId: finding.projectContextId,
    analysisId: finding.analysisId,
    commitSha: finding.commitSha,
    evidence: finding.evidence.map((item) => ({ ...item }))
  };
}

function page<T>(items: readonly T[], pageNumber: number, pageSize: number) {
  return {
    items: items.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
    pagination: {
      page: pageNumber,
      pageSize,
      total: items.length,
      hasNextPage: pageNumber * pageSize < items.length
    }
  };
}

function count(
  items: readonly DependencyFindingItem[],
  lifecycle: DependencyFindingItem["lifecycle"]
) {
  return items.filter((item) => item.lifecycle === lifecycle).length;
}

function emptyCurrent(query: DependencyIntelligencePageQuery): DependencyIntelligenceResponse {
  return {
    available: false,
    provenance: null,
    compatibility: null,
    summary: null,
    declarations: page([], query.page, query.pageSize),
    findings: page([], query.findingPage, query.findingPageSize)
  };
}

function emptyHistory(
  query: DependencyIntelligencePageQuery
): DependencyIntelligenceHistoryResponse {
  return {
    available: false,
    compatibility: null,
    current: null,
    previous: null,
    lifecycleCounts: { new: 0, persisting: 0, resolved: 0, recurring: 0 },
    changeCounts: { added: 0, removed: 0, versionChanged: 0, dependencyTypeChanged: 0 },
    findings: page([], query.findingPage, query.findingPageSize),
    changes: page([], query.page, query.pageSize)
  };
}
