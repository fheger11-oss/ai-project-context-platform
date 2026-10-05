import { Inject, Injectable } from "@nestjs/common";
import type {
  ArchitectureFindingItem,
  ArchitectureFindingLifecycle,
  ArchitectureIntelligenceResponse
} from "@ai-context/contracts";

import { RepositoriesService } from "../../repositories/repositories.service.js";
import type { ArchitectureHistoryComparison } from "../domain/architecture-history-comparison.js";
import {
  ARCHITECTURE_FINDING_OCCURRENCE_REPOSITORY,
  type ArchitectureFindingOccurrenceRecord,
  type ArchitectureFindingOccurrenceRepository
} from "../domain/contracts/architecture-finding-occurrence-repository.contract.js";
import {
  ARCHITECTURE_INTELLIGENCE_READ_REPOSITORY,
  type ArchitectureIntelligenceReadRepository,
  type ArchitectureIntelligenceResultSource
} from "../domain/contracts/architecture-intelligence-read-repository.contract.js";
import {
  ARCHITECTURE_MODULE_MEASUREMENT_REPOSITORY,
  type ArchitectureModuleMeasurementRepository
} from "../domain/contracts/architecture-module-measurement-repository.contract.js";
import { GetArchitectureHistoryComparisonService } from "./get-architecture-history-comparison.service.js";

export type CurrentArchitectureIntelligenceQuery = {
  userId: string;
  repositoryId: string;
  page: number;
  pageSize: number;
  modulePage: number;
  modulePageSize: number;
  ruleId?: string;
  confidence?: "LOW" | "MEDIUM" | "HIGH";
  lifecycle?: ArchitectureFindingLifecycle;
};

@Injectable()
export class GetCurrentArchitectureIntelligenceService {
  constructor(
    @Inject(ARCHITECTURE_INTELLIGENCE_READ_REPOSITORY)
    private readonly reader: ArchitectureIntelligenceReadRepository,
    @Inject(ARCHITECTURE_FINDING_OCCURRENCE_REPOSITORY)
    private readonly findings: ArchitectureFindingOccurrenceRepository,
    @Inject(ARCHITECTURE_MODULE_MEASUREMENT_REPOSITORY)
    private readonly measurements: ArchitectureModuleMeasurementRepository,
    @Inject(GetArchitectureHistoryComparisonService)
    private readonly history: GetArchitectureHistoryComparisonService,
    @Inject(RepositoriesService) private readonly repositories: RepositoriesService
  ) {}

  async execute(
    query: CurrentArchitectureIntelligenceQuery
  ): Promise<ArchitectureIntelligenceResponse> {
    await this.repositories.getScanAccessMetadataForUser(query.userId, query.repositoryId);
    const source = await this.reader.findCurrent(query.repositoryId);
    if (!source?.request) return { processing: null, intelligence: null };
    const processing = processingSummary(source);
    if (source.request.status !== "COMPLETED") return { processing, intelligence: null };

    const comparison = await this.history.execute(query.repositoryId, source.request.id);
    const current = await this.findings.listByRepositoryAndProcessingRequest(
      query.repositoryId,
      source.request.id
    );
    const previous =
      comparison.status === "COMPARABLE"
        ? await this.findings.listByRepositoryAndProcessingRequest(
            query.repositoryId,
            comparison.previousProcessingRequestId
          )
        : [];
    const lifecycleByOccurrence = lifecycleMap(comparison);
    const resolvedIds = new Set(
      comparison.status === "COMPARABLE"
        ? comparison.lifecycle
            .filter((item) => item.lifecycle === "RESOLVED")
            .map((item) => item.previousOccurrenceId)
            .filter((value): value is string => Boolean(value))
        : []
    );
    const allFindings = [
      ...current.map((item) => toFinding(item, lifecycleByOccurrence.get(item.id) ?? null)),
      ...previous
        .filter((item) => resolvedIds.has(item.id))
        .map((item) => toFinding(item, "RESOLVED"))
    ].sort((left, right) => left.fingerprint.localeCompare(right.fingerprint));
    const filtered = allFindings.filter(
      (item) =>
        (!query.ruleId || item.ruleId === query.ruleId) &&
        (!query.confidence || item.confidence === query.confidence) &&
        (!query.lifecycle || item.lifecycle === query.lifecycle)
    );
    const modules = await this.measurements.listByRepositoryAndProcessingRequest(
      query.repositoryId,
      source.request.id
    );
    const findingItems = paginate(filtered, query.page, query.pageSize);
    const moduleItems = paginate(modules, query.modulePage, query.modulePageSize);
    const changes =
      comparison.status === "COMPARABLE"
        ? {
            addedModules: [...comparison.addedModules],
            removedModules: [...comparison.removedModules],
            addedRelationships: [...comparison.addedRelationships],
            removedRelationships: [...comparison.removedRelationships]
          }
        : {
            addedModules: [],
            removedModules: [],
            addedRelationships: [],
            removedRelationships: []
          };

    return {
      processing,
      intelligence: {
        compatibility: comparison.status,
        summary: {
          moduleCount: modules.length,
          relationshipCount: modules.reduce((total, module) => total + module.fanOut, 0),
          circularDependencyFindingCount: current.length,
          addedModuleCount: changes.addedModules.length,
          removedModuleCount: changes.removedModules.length,
          addedRelationshipCount: changes.addedRelationships.length,
          removedRelationshipCount: changes.removedRelationships.length
        },
        findings: {
          items: findingItems,
          pagination: pagination(query.page, query.pageSize, filtered.length)
        },
        modules: {
          items: moduleItems.map(
            ({
              id: _id,
              repositoryId: _repositoryId,
              projectContextId: _projectContextId,
              processingRequestId: _processingRequestId,
              createdAt: _createdAt,
              ...item
            }) => item
          ),
          pagination: pagination(query.modulePage, query.modulePageSize, modules.length)
        },
        changes
      }
    };
  }
}

export function processingSummary(source: ArchitectureIntelligenceResultSource) {
  const request = source.request!;
  return {
    status: request.status,
    projectContextId: source.projectContextId,
    commitSha: source.commitSha,
    processorVersion: request.processorVersion,
    analyzerVersion: source.analyzerVersion,
    contextVersion: source.contextVersion,
    startedAt: request.startedAt?.toISOString() ?? null,
    completedAt: request.completedAt?.toISOString() ?? null,
    failureCategory: request.lastFailureCategory,
    attemptCount: request.attemptCount,
    nextAttemptAt: request.nextAttemptAt.toISOString()
  };
}

function lifecycleMap(comparison: ArchitectureHistoryComparison) {
  const values = new Map<string, ArchitectureFindingLifecycle>();
  if (comparison.status === "COMPARABLE") {
    for (const item of comparison.lifecycle) {
      if (item.currentOccurrenceId) values.set(item.currentOccurrenceId, item.lifecycle);
    }
  }
  return values;
}

function toFinding(
  item: ArchitectureFindingOccurrenceRecord,
  lifecycle: ArchitectureFindingLifecycle | null
): ArchitectureFindingItem {
  return {
    occurrenceId: item.id,
    projectContextId: item.projectContextId,
    fingerprint: item.fingerprint,
    ruleId: item.ruleId,
    ruleVersion: item.ruleVersion,
    confidence: item.confidence,
    lifecycle,
    subject:
      item.subject.kind === "CYCLE"
        ? { kind: "CYCLE", moduleIds: [...item.subject.moduleIds] }
        : { ...item.subject },
    evidence: [...item.evidence],
    createdAt: item.createdAt.toISOString()
  };
}

function paginate<T>(items: readonly T[], page: number, pageSize: number): T[] {
  return items.slice((page - 1) * pageSize, page * pageSize);
}

function pagination(page: number, pageSize: number, total: number) {
  return { page, pageSize, total, hasNextPage: page * pageSize < total };
}
