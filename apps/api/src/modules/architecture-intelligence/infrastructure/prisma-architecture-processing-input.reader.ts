import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service.js";
import { CONTEXT_ENGINE_VERSION } from "../../context/application/context-engine-version.js";
import type {
  ArchitectureDependency,
  ArchitecturalModule
} from "../../context/domain/project-context-architecture.js";
import type {
  ArchitectureProcessingInput,
  ArchitectureProcessingInputReader
} from "../domain/contracts/architecture-processing-input-reader.contract.js";
import type { ArchitectureProcessingRequestRecord } from "../domain/contracts/architecture-processing-request-repository.contract.js";
import { InvalidArchitectureProcessingInputError } from "../domain/errors/invalid-architecture-processing-input.error.js";

@Injectable()
export class PrismaArchitectureProcessingInputReader implements ArchitectureProcessingInputReader {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async read(request: ArchitectureProcessingRequestRecord): Promise<ArchitectureProcessingInput> {
    const context = await this.prisma.projectContext.findFirst({
      where: { id: request.projectContextId, repositoryId: request.repositoryId },
      select: {
        id: true,
        contextId: true,
        analysisId: true,
        scanId: true,
        repositoryId: true,
        commitSha: true,
        contextVersion: true,
        generatedAt: true,
        snapshot: true,
        analysis: {
          select: {
            id: true,
            scanId: true,
            repositoryId: true,
            commitSha: true,
            analyzerVersion: true,
            status: true,
            relationships: true
          }
        }
      }
    });
    if (!context) {
      throw invalid(`ProjectContext ${request.projectContextId} was not found for its repository.`);
    }
    const analysis = context.analysis;
    if (
      context.id !== request.projectContextId ||
      context.repositoryId !== request.repositoryId ||
      analysis.id !== context.analysisId ||
      analysis.repositoryId !== request.repositoryId ||
      analysis.scanId !== context.scanId ||
      analysis.commitSha !== context.commitSha ||
      analysis.status !== "COMPLETED"
    ) {
      throw invalid(
        `Architecture processing provenance is inconsistent for request ${request.id}.`
      );
    }
    for (const [field, value] of [
      ["contextVersion", context.contextVersion],
      ["contextId", context.contextId],
      ["analyzerVersion", analysis.analyzerVersion],
      ["commitSha", context.commitSha],
      ["scanId", context.scanId],
      ["analysisId", context.analysisId]
    ] as const) {
      if (value.length === 0) throw invalid(`Architecture processing ${field} is missing.`);
    }

    const snapshot = record(context.snapshot, "ProjectContext snapshot");
    const snapshotArchitecture = record(snapshot.architecture, "ProjectContext architecture");
    const architectureClaims = array(
      snapshotArchitecture.claims,
      "ProjectContext architecture claims"
    );
    const architectureModel = readArchitectureModel(
      snapshot.architectureModel,
      context.contextVersion
    );
    const semanticRelationships = readSemanticRelationships(
      snapshot.semantic,
      context.contextVersion
    );
    const analysisRelationships = array(analysis.relationships, "Analysis relationships");
    const snapshotComparisons = [
      ["contextId", context.contextId],
      ["analysisId", context.analysisId],
      ["scanId", context.scanId],
      ["repositoryId", context.repositoryId],
      ["commitSha", context.commitSha],
      ["contextVersion", context.contextVersion]
    ] as const;
    for (const [field, expected] of snapshotComparisons) {
      if (snapshot[field] !== expected) {
        throw invalid(`ProjectContext snapshot ${field} does not match persisted provenance.`);
      }
    }
    if (snapshot.generatedAt !== context.generatedAt.toISOString()) {
      throw invalid("ProjectContext snapshot generatedAt does not match persisted provenance.");
    }

    return {
      repositoryId: context.repositoryId,
      projectContextId: context.id,
      analysisId: context.analysisId,
      scanId: context.scanId,
      commitSha: context.commitSha,
      contextVersion: context.contextVersion,
      analyzerVersion: analysis.analyzerVersion,
      architectureModel,
      unresolvedSemanticRelationshipCount: semanticRelationships.filter(
        (relationship) => !relationship.resolved
      ).length,
      architectureClaims,
      analysisRelationships
    };
  }
}

function readArchitectureModel(
  value: unknown,
  contextVersion: string
): { modules: readonly ArchitecturalModule[]; dependencies: readonly ArchitectureDependency[] } {
  if (value === undefined && contextVersion !== CONTEXT_ENGINE_VERSION) {
    return { modules: [], dependencies: [] };
  }
  const model = record(value, "ProjectContext architectureModel");
  const modules = array(model.modules, "ProjectContext architectureModel modules");
  const dependencies = array(model.dependencies, "ProjectContext architectureModel dependencies");
  for (const module of modules) {
    const candidate = record(module, "ProjectContext architecture module");
    if (!nonEmptyString(candidate.id) || !architectureConfidence(candidate.confidence)) {
      throw invalid("ProjectContext architecture module identity or confidence is invalid.");
    }
  }
  for (const dependency of dependencies) {
    const candidate = record(dependency, "ProjectContext architecture dependency");
    if (
      !nonEmptyString(candidate.id) ||
      !nonEmptyString(candidate.sourceModuleId) ||
      !nonEmptyString(candidate.targetModuleId) ||
      candidate.resolution !== "RESOLVED" ||
      !Array.isArray(candidate.relationshipIds) ||
      !candidate.relationshipIds.every(nonEmptyString)
    ) {
      throw invalid("ProjectContext architecture dependency is invalid.");
    }
  }
  return {
    modules: modules as unknown as readonly ArchitecturalModule[],
    dependencies: dependencies as unknown as readonly ArchitectureDependency[]
  };
}

function readSemanticRelationships(
  value: unknown,
  contextVersion: string
): readonly { resolved: boolean }[] {
  if (value === undefined && contextVersion !== CONTEXT_ENGINE_VERSION) return [];
  const semantic = record(value, "ProjectContext semantic");
  const relationships = array(semantic.relationships, "ProjectContext semantic relationships");
  return relationships.map((value) => {
    const relationship = record(value, "ProjectContext semantic relationship");
    if (typeof relationship.resolved !== "boolean") {
      throw invalid("ProjectContext semantic relationship resolution is invalid.");
    }
    return { resolved: relationship.resolved };
  });
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw invalid(`${label} must be an object.`);
  return value as Record<string, unknown>;
}

function array(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw invalid(`${label} must be an array.`);
  return value;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function architectureConfidence(value: unknown): value is "HIGH" | "MEDIUM" | "LOW" {
  return value === "HIGH" || value === "MEDIUM" || value === "LOW";
}

function invalid(message: string) {
  return new InvalidArchitectureProcessingInputError(message);
}
