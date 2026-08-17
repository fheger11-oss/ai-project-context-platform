import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../prisma/prisma.service.js";
import type { ContextClaim } from "../domain/context-claim.js";
import type { ProjectContextSnapshot } from "../domain/project-context.js";
import { ProjectContext } from "../domain/project-context.js";
import { ContextPersistenceError } from "../domain/errors/context-persistence.error.js";
import { InvalidPersistedProjectContextError } from "../domain/errors/invalid-persisted-project-context.error.js";
import { PrismaProjectContextRepository } from "./prisma-project-context.repository.js";

const generatedAt = new Date("2026-08-17T10:00:00.000Z");
const createdAt = new Date("2026-08-17T10:00:01.000Z");

const observedClaim: ContextClaim = {
  value: {
    type: "LANGUAGE",
    language: "TYPESCRIPT",
    fileCount: 2
  },
  kind: "OBSERVED",
  confidence: "HIGH",
  evidence: [
    {
      kind: "PROJECT_METADATA",
      reference: {
        kind: "PROJECT_METADATA",
        field: "languages"
      }
    }
  ]
};

const inferredClaim: ContextClaim = {
  value: {
    type: "SOURCE_ENTRY_POINT_CANDIDATE",
    path: "src/main.ts",
    entryPointId: "entry-point:src/main.ts"
  },
  kind: "INFERRED",
  confidence: "MEDIUM",
  evidence: [
    {
      kind: "FILE_CLASSIFICATION",
      reference: {
        kind: "FILE_CLASSIFICATION",
        path: "src/main.ts"
      }
    },
    {
      kind: "RELATIONSHIP",
      reference: {
        kind: "RELATIONSHIP",
        sourcePath: "src/main.ts",
        specifier: "./app.module"
      }
    }
  ]
};

const context = ProjectContext.create({
  contextId: "context:analysis_1:context-engine@5.7.1",
  analysisId: "analysis_1",
  scanId: "scan_1",
  repositoryId: "repository_1",
  commitSha: "abc123",
  contextVersion: "context-engine@5.7.1",
  generatedAt,
  project: { claims: [observedClaim] },
  entryPoints: { claims: [inferredClaim] },
  testing: { claims: [] },
  infrastructure: { claims: [] }
});

function snapshot(projectContext = context): ProjectContextSnapshot {
  return projectContext.toSnapshot();
}

function serialized(projectContext = context) {
  return {
    ...snapshot(projectContext),
    generatedAt: projectContext.generatedAt.toISOString()
  };
}

function serializedAt(date: Date, projectContext = context) {
  return {
    ...serialized(projectContext),
    generatedAt: date.toISOString()
  };
}

function stored(
  overrides: Partial<{
    id: string;
    context: ProjectContext;
    contextId: string;
    analysisId: string;
    scanId: string;
    repositoryId: string;
    commitSha: string;
    contextVersion: string;
    generatedAt: Date;
    createdAt: Date;
    snapshot: unknown;
  }> = {}
) {
  const projectContext = overrides.context ?? context;

  return {
    id: overrides.id ?? "project_context_1",
    contextId: overrides.contextId ?? projectContext.contextId,
    analysisId: overrides.analysisId ?? projectContext.analysisId,
    scanId: overrides.scanId ?? projectContext.scanId,
    repositoryId: overrides.repositoryId ?? projectContext.repositoryId,
    commitSha: overrides.commitSha ?? projectContext.commitSha,
    contextVersion: overrides.contextVersion ?? projectContext.contextVersion,
    generatedAt: overrides.generatedAt ?? projectContext.generatedAt,
    createdAt: overrides.createdAt ?? createdAt,
    snapshot: overrides.snapshot ?? serialized(projectContext)
  };
}

function createRepository(
  options: {
    analysis?: { scanId: string; repositoryId: string; commitSha: string } | null;
    findUniqueResult?: unknown;
    findManyResult?: unknown[];
    findFirstResult?: unknown;
  } = {}
) {
  const create = vi.fn(async (query) =>
    stored({
      id: `project_context_${create.mock.calls.length}`,
      snapshot: query.data.snapshot,
      generatedAt: query.data.generatedAt,
      createdAt
    })
  );
  const findUnique = vi.fn(async () =>
    Object.hasOwn(options, "findUniqueResult") ? options.findUniqueResult : stored()
  );
  const findMany = vi.fn(
    async () =>
      options.findManyResult ?? [
        stored({
          id: "project_context_new",
          generatedAt: new Date("2026-08-17T10:05:00.000Z"),
          createdAt: new Date("2026-08-17T10:05:01.000Z"),
          snapshot: serializedAt(new Date("2026-08-17T10:05:00.000Z"))
        }),
        stored({
          id: "project_context_old",
          generatedAt,
          createdAt
        })
      ]
  );
  const findFirst = vi.fn(async () =>
    Object.hasOwn(options, "findFirstResult")
      ? options.findFirstResult
      : stored({
          id: "project_context_new",
          generatedAt: new Date("2026-08-17T10:05:00.000Z"),
          createdAt: new Date("2026-08-17T10:05:01.000Z"),
          snapshot: serializedAt(new Date("2026-08-17T10:05:00.000Z"))
        })
  );
  const analysisFindUnique = vi.fn(async () =>
    Object.hasOwn(options, "analysis")
      ? options.analysis
      : {
          scanId: "scan_1",
          repositoryId: "repository_1",
          commitSha: "abc123"
        }
  );
  const projectContextDelegate = {
    create,
    findUnique,
    findMany,
    findFirst
  };
  const analysisDelegate = {
    findUnique: analysisFindUnique
  };
  const prisma = {
    projectContext: projectContextDelegate,
    analysis: analysisDelegate
  } as unknown as PrismaService;

  return {
    projectContext: projectContextDelegate,
    analysis: analysisDelegate,
    repository: new PrismaProjectContextRepository(prisma)
  };
}

describe("PrismaProjectContextRepository", () => {
  it("persists and reconstructs a complete ProjectContext aggregate", async () => {
    const { repository, projectContext, analysis } = createRepository();

    const persisted = await repository.save(context);

    expect(analysis.findUnique).toHaveBeenCalledWith({
      where: { id: "analysis_1" },
      select: {
        scanId: true,
        repositoryId: true,
        commitSha: true
      }
    });
    expect(projectContext.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        contextId: "context:analysis_1:context-engine@5.7.1",
        analysisId: "analysis_1",
        scanId: "scan_1",
        repositoryId: "repository_1",
        commitSha: "abc123",
        contextVersion: "context-engine@5.7.1",
        generatedAt,
        snapshot: expect.objectContaining({
          contextVersion: "context-engine@5.7.1",
          generatedAt: generatedAt.toISOString()
        })
      })
    });
    expect(persisted.context.toSnapshot()).toEqual(snapshot());
  });

  it("creates immutable historical records instead of overwriting previous contexts", async () => {
    const { repository, projectContext } = createRepository();

    await repository.save(context);
    await repository.save(context);
    await repository.save(context);

    expect(projectContext.create).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(projectContext.create.mock.calls)).not.toMatch(/upsert|update|delete/i);
  });

  it("returns null for a missing persisted ProjectContext", async () => {
    const { repository } = createRepository({ findUniqueResult: null });

    await expect(repository.findById("missing")).resolves.toBeNull();
  });

  it("lists Context history for an Analysis in deterministic latest-first order", async () => {
    const { repository, projectContext } = createRepository();

    const history = await repository.listByAnalysisId("analysis_1");

    expect(history.map((item) => item.id)).toEqual(["project_context_new", "project_context_old"]);
    expect(projectContext.findMany).toHaveBeenCalledWith({
      where: { analysisId: "analysis_1" },
      orderBy: [{ generatedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }]
    });
  });

  it("retrieves the latest Context for an Analysis using the same deterministic ordering", async () => {
    const { repository, projectContext } = createRepository();

    const latest = await repository.findLatestByAnalysisId("analysis_1");

    expect(latest?.id).toBe("project_context_new");
    expect(projectContext.findFirst).toHaveBeenCalledWith({
      where: { analysisId: "analysis_1" },
      orderBy: [{ generatedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }]
    });
  });

  it("allows Contexts from different Context Engine versions to coexist for one Analysis", async () => {
    const oldContext = ProjectContext.create({
      ...snapshot(),
      contextId: "context:analysis_1:context-engine@5.7.0",
      contextVersion: "context-engine@5.7.0",
      generatedAt: new Date("2026-08-17T09:00:00.000Z")
    });
    const { repository } = createRepository({
      findManyResult: [
        stored({ id: "context_new", context }),
        stored({
          id: "context_old",
          context: oldContext,
          contextVersion: "context-engine@5.7.0",
          generatedAt: oldContext.generatedAt,
          snapshot: serialized(oldContext)
        })
      ]
    });

    const history = await repository.listByAnalysisId("analysis_1");

    expect(history.map((item) => item.contextVersion)).toEqual([
      "context-engine@5.7.1",
      "context-engine@5.7.0"
    ]);
  });

  it("rejects persistence when the source Analysis does not exist", async () => {
    const { repository } = createRepository({ analysis: null });

    await expect(repository.save(context)).rejects.toThrow(ContextPersistenceError);
  });

  it("rejects persistence when ProjectContext provenance does not match the source Analysis", async () => {
    const { repository } = createRepository({
      analysis: {
        scanId: "scan_2",
        repositoryId: "repository_1",
        commitSha: "abc123"
      }
    });

    await expect(repository.save(context)).rejects.toThrow(ContextPersistenceError);
  });

  it("rejects malformed persisted ProjectContext snapshots explicitly", async () => {
    const { repository } = createRepository({
      findUniqueResult: stored({
        snapshot: {
          ...serialized(),
          generatedAt: "not-a-date"
        }
      })
    });

    await expect(repository.findById("project_context_1")).rejects.toThrow(
      InvalidPersistedProjectContextError
    );
  });

  it.each([
    ["contextId", { contextId: "context:mismatched" }],
    ["analysisId", { analysisId: "analysis_2" }],
    ["scanId", { scanId: "scan_2" }],
    ["repositoryId", { repositoryId: "repository_2" }],
    ["commitSha", { commitSha: "def456" }],
    ["contextVersion", { contextVersion: "context-engine@5.7.0" }],
    ["generatedAt", { generatedAt: new Date("2026-08-17T11:00:00.000Z") }]
  ] as const)(
    "rejects persisted ProjectContext when %s metadata does not match the snapshot",
    async (_field, overrides) => {
      const { repository } = createRepository({
        findUniqueResult: stored(overrides)
      });

      await expect(repository.findById("project_context_1")).rejects.toThrow(
        InvalidPersistedProjectContextError
      );
    }
  );

  it("does not persist credential-shaped fields in the ProjectContext payload", async () => {
    const { repository, projectContext } = createRepository();

    await repository.save(context);

    expect(JSON.stringify(projectContext.create.mock.calls)).not.toMatch(
      /accessToken|refreshToken|githubToken|authorization|credential/i
    );
  });
});
