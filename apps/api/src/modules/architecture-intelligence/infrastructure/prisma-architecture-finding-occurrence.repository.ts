import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "../../../generated/prisma/client.js";
import type { ArchitectureFindingOccurrenceModel } from "../../../generated/prisma/models.js";

import { PrismaService } from "../../prisma/prisma.service.js";
import type {
  ArchitectureFindingOccurrenceRecord,
  ArchitectureFindingOccurrenceRepository,
  CreateArchitectureFindingOccurrenceInput
} from "../domain/contracts/architecture-finding-occurrence-repository.contract.js";
import type {
  ArchitectureFindingEvidence,
  ArchitectureFindingSubject,
  ArchitectureSourceLocation
} from "../domain/architecture-finding-evidence.js";

@Injectable()
export class PrismaArchitectureFindingOccurrenceRepository implements ArchitectureFindingOccurrenceRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(
    input: CreateArchitectureFindingOccurrenceInput
  ): Promise<ArchitectureFindingOccurrenceRecord> {
    const stored = await this.prisma.architectureFindingOccurrence.create({
      data: {
        repositoryId: input.repositoryId,
        projectContextId: input.projectContextId,
        processingRequestId: input.processingRequestId,
        fingerprint: input.fingerprint,
        ruleId: input.ruleId,
        ruleVersion: input.ruleVersion,
        confidence: input.confidence,
        subject: toJson(input.subject),
        evidence: toJson(input.evidence)
      }
    });
    return toRecord(stored);
  }

  async listByRepositoryAndProcessingRequest(
    repositoryId: string,
    processingRequestId: string
  ): Promise<ArchitectureFindingOccurrenceRecord[]> {
    const stored = await this.prisma.architectureFindingOccurrence.findMany({
      where: { repositoryId, processingRequestId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }]
    });
    return stored.map(toRecord);
  }

  async listByRepositoryAndProjectContext(
    repositoryId: string,
    projectContextId: string
  ): Promise<ArchitectureFindingOccurrenceRecord[]> {
    const stored = await this.prisma.architectureFindingOccurrence.findMany({
      where: { repositoryId, projectContextId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }]
    });
    return stored.map(toRecord);
  }
}

function toRecord(stored: ArchitectureFindingOccurrenceModel): ArchitectureFindingOccurrenceRecord {
  return {
    ...stored,
    subject: readSubject(stored.id, stored.subject),
    evidence: readEvidence(stored.id, stored.evidence)
  };
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function readSubject(id: string, value: unknown): ArchitectureFindingSubject {
  const subject = record(value);
  if (subject?.kind === "MODULE" && string(subject.moduleId)) {
    return { kind: "MODULE", moduleId: subject.moduleId };
  }
  if (
    subject?.kind === "RELATIONSHIP" &&
    string(subject.sourceModuleId) &&
    string(subject.targetModuleId)
  ) {
    return {
      kind: "RELATIONSHIP",
      sourceModuleId: subject.sourceModuleId,
      targetModuleId: subject.targetModuleId
    };
  }
  if (
    subject?.kind === "CYCLE" &&
    Array.isArray(subject.moduleIds) &&
    subject.moduleIds.every(string)
  ) {
    return { kind: "CYCLE", moduleIds: subject.moduleIds };
  }
  throw new Error(`ArchitectureFindingOccurrence ${id} has an invalid subject.`);
}

function readEvidence(id: string, value: unknown): ArchitectureFindingEvidence[] {
  if (!Array.isArray(value)) {
    throw new Error(`ArchitectureFindingOccurrence ${id} has invalid evidence.`);
  }
  return value.map((item) => readEvidenceItem(id, item));
}

function readEvidenceItem(id: string, value: unknown): ArchitectureFindingEvidence {
  const evidence = record(value);
  if (evidence?.kind === "MODULE" && string(evidence.moduleId)) {
    return { kind: "MODULE", moduleId: evidence.moduleId };
  }
  if (
    evidence?.kind === "MODULE_RELATIONSHIP" &&
    string(evidence.sourceModuleId) &&
    string(evidence.targetModuleId)
  ) {
    return {
      kind: "MODULE_RELATIONSHIP",
      sourceModuleId: evidence.sourceModuleId,
      targetModuleId: evidence.targetModuleId
    };
  }
  if (
    evidence?.kind === "ANALYSIS_RELATIONSHIP" &&
    string(evidence.sourcePath) &&
    string(evidence.targetPath) &&
    (evidence.relationshipKind === "IMPORTS" || evidence.relationshipKind === "RE_EXPORTS") &&
    string(evidence.specifier) &&
    sourceLocation(evidence.location)
  ) {
    return {
      kind: "ANALYSIS_RELATIONSHIP",
      sourcePath: evidence.sourcePath,
      targetPath: evidence.targetPath,
      relationshipKind: evidence.relationshipKind,
      specifier: evidence.specifier,
      location: evidence.location
    };
  }
  throw new Error(`ArchitectureFindingOccurrence ${id} has invalid evidence.`);
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function string(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function sourceLocation(value: unknown): value is ArchitectureSourceLocation {
  const location = record(value);
  return Boolean(
    location &&
    ["start", "end", "startLine", "startColumn", "endLine", "endColumn"].every(
      (key) => typeof location[key] === "number" && Number.isInteger(location[key])
    )
  );
}
