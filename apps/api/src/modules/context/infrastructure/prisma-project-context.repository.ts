import { Inject, Injectable } from "@nestjs/common";

import type { Prisma } from "../../../generated/prisma/client.js";
import type { ProjectContextModel } from "../../../generated/prisma/models.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import type {
  PersistedProjectContext,
  ProjectContextRepository
} from "../domain/contracts/project-context-repository.contract.js";
import { ContextPersistenceError } from "../domain/errors/context-persistence.error.js";
import { InvalidPersistedProjectContextError } from "../domain/errors/invalid-persisted-project-context.error.js";
import { ProjectContext, type ProjectContextSnapshot } from "../domain/project-context.js";

@Injectable()
export class PrismaProjectContextRepository implements ProjectContextRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(context: ProjectContext): Promise<PersistedProjectContext> {
    const snapshot = context.toSnapshot();
    await this.assertAnalysisMatchesContext(snapshot);

    const stored = await this.prisma.projectContext.create({
      data: {
        contextId: snapshot.contextId,
        analysisId: snapshot.analysisId,
        scanId: snapshot.scanId,
        repositoryId: snapshot.repositoryId,
        commitSha: snapshot.commitSha,
        contextVersion: snapshot.contextVersion,
        generatedAt: snapshot.generatedAt,
        snapshot: toJson(serializeSnapshot(snapshot))
      }
    });

    return this.toPersistedContext(stored);
  }

  async findById(id: string): Promise<PersistedProjectContext | null> {
    const stored = await this.prisma.projectContext.findUnique({
      where: { id }
    });

    return stored ? this.toPersistedContext(stored) : null;
  }

  async listByAnalysisId(analysisId: string): Promise<PersistedProjectContext[]> {
    const stored = await this.prisma.projectContext.findMany({
      where: { analysisId },
      orderBy: historyOrdering()
    });

    return stored.map((record) => this.toPersistedContext(record));
  }

  async findLatestByAnalysisId(analysisId: string): Promise<PersistedProjectContext | null> {
    const stored = await this.prisma.projectContext.findFirst({
      where: { analysisId },
      orderBy: historyOrdering()
    });

    return stored ? this.toPersistedContext(stored) : null;
  }

  private async assertAnalysisMatchesContext(snapshot: ProjectContextSnapshot): Promise<void> {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id: snapshot.analysisId },
      select: {
        scanId: true,
        repositoryId: true,
        commitSha: true
      }
    });

    if (!analysis) {
      throw new ContextPersistenceError(`Analysis ${snapshot.analysisId} does not exist.`);
    }

    if (
      analysis.scanId !== snapshot.scanId ||
      analysis.repositoryId !== snapshot.repositoryId ||
      analysis.commitSha !== snapshot.commitSha
    ) {
      throw new ContextPersistenceError(
        `ProjectContext ${snapshot.contextId} does not match analysis ${snapshot.analysisId}.`
      );
    }
  }

  private toPersistedContext(stored: ProjectContextModel): PersistedProjectContext {
    const snapshot = deserializeSnapshot(stored.id, stored.snapshot);
    assertSnapshotMatchesStoredMetadata(stored, snapshot);

    return {
      id: stored.id,
      contextId: stored.contextId,
      analysisId: stored.analysisId,
      scanId: stored.scanId,
      repositoryId: stored.repositoryId,
      commitSha: stored.commitSha,
      contextVersion: stored.contextVersion,
      generatedAt: stored.generatedAt,
      createdAt: stored.createdAt,
      context: ProjectContext.fromSnapshot(snapshot)
    };
  }
}

type SerializedProjectContextSnapshot = Omit<ProjectContextSnapshot, "generatedAt"> & {
  generatedAt: string;
};

function serializeSnapshot(snapshot: ProjectContextSnapshot): SerializedProjectContextSnapshot {
  return {
    ...snapshot,
    generatedAt: snapshot.generatedAt.toISOString()
  };
}

function deserializeSnapshot(recordId: string, value: unknown): ProjectContextSnapshot {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new InvalidPersistedProjectContextError(recordId, "snapshot must be an object.");
  }

  const snapshot = value as SerializedProjectContextSnapshot;

  if (typeof snapshot.generatedAt !== "string") {
    throw new InvalidPersistedProjectContextError(
      recordId,
      "snapshot.generatedAt must be a string."
    );
  }

  const generatedAt = new Date(snapshot.generatedAt);

  if (Number.isNaN(generatedAt.getTime())) {
    throw new InvalidPersistedProjectContextError(recordId, "snapshot.generatedAt is invalid.");
  }

  return {
    ...snapshot,
    generatedAt
  };
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function assertSnapshotMatchesStoredMetadata(
  stored: ProjectContextModel,
  snapshot: ProjectContextSnapshot
): void {
  const comparisons = [
    ["contextId", stored.contextId, snapshot.contextId],
    ["analysisId", stored.analysisId, snapshot.analysisId],
    ["scanId", stored.scanId, snapshot.scanId],
    ["repositoryId", stored.repositoryId, snapshot.repositoryId],
    ["commitSha", stored.commitSha, snapshot.commitSha],
    ["contextVersion", stored.contextVersion, snapshot.contextVersion],
    ["generatedAt", stored.generatedAt.toISOString(), snapshot.generatedAt.toISOString()]
  ] as const;

  for (const [field, storedValue, snapshotValue] of comparisons) {
    if (storedValue !== snapshotValue) {
      throw new InvalidPersistedProjectContextError(
        stored.id,
        `${field} does not match persisted metadata.`
      );
    }
  }
}

function historyOrdering(): Prisma.ProjectContextOrderByWithRelationInput[] {
  return [{ generatedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }];
}
