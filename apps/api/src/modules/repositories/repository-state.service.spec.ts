import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { RepositoryFreshnessStatus } from "../../generated/prisma/enums.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import type { RepositoriesService } from "./repositories.service.js";
import { RepositoryStateService } from "./repository-state.service.js";

const now = new Date("2026-09-22T12:00:00.000Z");

function createState(overrides: Partial<RepositoryStateRecord> = {}): RepositoryStateRecord {
  return {
    id: "state_1",
    repositoryId: "repository_1",
    remoteHeadCommitSha: null,
    remoteHeadCheckedAt: null,
    lastScannedCommitSha: null,
    lastAnalyzedCommitSha: null,
    currentProjectContextId: null,
    currentContextCommitSha: null,
    freshnessStatus: RepositoryFreshnessStatus.UNKNOWN,
    lastUpdateStatus: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function createContext(overrides: Partial<ProjectContextRecord> = {}): ProjectContextRecord {
  const context = {
    id: "context_1",
    contextId: "ctxaro_context_1",
    analysisId: "analysis_1",
    scanId: "scan_1",
    repositoryId: "repository_1",
    commitSha: "commit-context",
    contextVersion: "context-engine@5.7.1",
    generatedAt: now,
    snapshot: {},
    createdAt: now,
    ...overrides
  };

  return {
    ...context,
    snapshot: {
      contextId: context.contextId,
      analysisId: context.analysisId,
      scanId: context.scanId,
      repositoryId: context.repositoryId,
      commitSha: context.commitSha,
      contextVersion: context.contextVersion,
      generatedAt: context.generatedAt.toISOString(),
      project: { claims: [] },
      technology: { claims: [] },
      structure: { claims: [] },
      architecture: { claims: [] },
      entryPoints: { claims: [] },
      testing: { claims: [] },
      infrastructure: { claims: [] },
      ambiguities: []
    }
  };
}

function createHarness(
  options: {
    existingState?: RepositoryStateRecord | null;
    createdState?: RepositoryStateRecord;
    completedScan?: { commitSha: string } | null;
    completedAnalysis?: { commitSha: string } | null;
    latestContext?: { id: string; commitSha: string } | null;
    currentContext?: ProjectContextRecord | null;
    repositoryIdsWithoutState?: string[];
    ownershipError?: Error;
  } = {}
) {
  const create = vi.fn(
    async (args: { data: Partial<RepositoryStateRecord> & { repositoryId: string } }) =>
      createState({
        repositoryId: args.data.repositoryId,
        remoteHeadCommitSha: args.data.remoteHeadCommitSha ?? null,
        remoteHeadCheckedAt: args.data.remoteHeadCheckedAt ?? null,
        lastScannedCommitSha: args.data.lastScannedCommitSha ?? null,
        lastAnalyzedCommitSha: args.data.lastAnalyzedCommitSha ?? null,
        currentProjectContextId: args.data.currentProjectContextId ?? null,
        currentContextCommitSha: args.data.currentContextCommitSha ?? null,
        freshnessStatus:
          args.data.freshnessStatus ??
          options.createdState?.freshnessStatus ??
          RepositoryFreshnessStatus.UNKNOWN,
        lastUpdateStatus: args.data.lastUpdateStatus ?? null,
        ...(options.createdState ?? {})
      })
  );
  const findUnique = vi.fn(async () => options.existingState ?? null);
  const repositoryFindMany = vi.fn(async () =>
    (options.repositoryIdsWithoutState ?? []).map((id) => ({ id }))
  );
  const scanFindFirst = vi.fn(async () => options.completedScan ?? null);
  const analysisFindFirst = vi.fn(async () => options.completedAnalysis ?? null);
  const projectContextFindFirst = vi.fn(async () => options.latestContext ?? null);
  const projectContextFindUnique = vi.fn(async () => options.currentContext ?? null);

  const prisma = {
    repository: {
      findMany: repositoryFindMany
    },
    repositoryState: {
      create,
      findUnique
    },
    scan: {
      findFirst: scanFindFirst
    },
    analysis: {
      findFirst: analysisFindFirst
    },
    projectContext: {
      findFirst: projectContextFindFirst,
      findUnique: projectContextFindUnique
    }
  } as unknown as PrismaService;
  const getScanAccessMetadataForUser = vi.fn(async () => {
    if (options.ownershipError) {
      throw options.ownershipError;
    }

    return {
      id: "repository_1",
      userId: "user_1",
      owner: "owner",
      name: "repository",
      defaultBranch: "main"
    };
  });
  const repositoriesService = {
    getScanAccessMetadataForUser
  } as unknown as RepositoriesService;

  return {
    service: new RepositoryStateService(prisma, repositoriesService),
    prisma,
    create,
    findUnique,
    repositoryFindMany,
    scanFindFirst,
    analysisFindFirst,
    projectContextFindFirst,
    projectContextFindUnique,
    getScanAccessMetadataForUser
  };
}

describe("RepositoryStateService", () => {
  it("initializes an owned repository with UNKNOWN freshness and nullable remote state", async () => {
    const { service, create, getScanAccessMetadataForUser } = createHarness();

    const state = await service.getOrInitialize("repository_1", "user_1");

    expect(getScanAccessMetadataForUser).toHaveBeenCalledWith("user_1", "repository_1");
    expect(create).toHaveBeenCalledWith({
      data: {
        repositoryId: "repository_1",
        remoteHeadCommitSha: null,
        remoteHeadCheckedAt: null,
        lastScannedCommitSha: null,
        lastAnalyzedCommitSha: null,
        currentProjectContextId: null,
        currentContextCommitSha: null,
        freshnessStatus: RepositoryFreshnessStatus.UNKNOWN,
        lastUpdateStatus: null
      }
    });
    expect(state).toMatchObject({
      repositoryId: "repository_1",
      remoteHeadCommitSha: null,
      remoteHeadCheckedAt: null,
      lastScannedCommitSha: null,
      lastAnalyzedCommitSha: null,
      currentProjectContextId: null,
      currentContextCommitSha: null,
      freshnessStatus: RepositoryFreshnessStatus.UNKNOWN,
      lastUpdateStatus: null
    });
  });

  it("does not expose RepositoryState across repository ownership boundaries", async () => {
    const { service, create } = createHarness({
      ownershipError: new NotFoundException("Repository was not found")
    });

    await expect(service.getOrInitialize("repository_1", "user_2")).rejects.toBeInstanceOf(
      NotFoundException
    );
    expect(create).not.toHaveBeenCalled();
  });

  it("uses the latest completed scan and ignores non-completed scans by query", async () => {
    const { service, scanFindFirst } = createHarness({
      completedScan: { commitSha: "commit-completed-scan" }
    });

    const state = await service.getOrInitialize("repository_1", "user_1");

    expect(scanFindFirst).toHaveBeenCalledWith({
      where: {
        repositoryId: "repository_1",
        status: "COMPLETED"
      },
      orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      select: { commitSha: true }
    });
    expect(state.lastScannedCommitSha).toBe("commit-completed-scan");
  });

  it("uses the latest completed generated analysis rather than row existence alone", async () => {
    const { service, analysisFindFirst } = createHarness({
      completedAnalysis: { commitSha: "commit-completed-analysis" }
    });

    const state = await service.getOrInitialize("repository_1", "user_1");

    expect(analysisFindFirst).toHaveBeenCalledWith({
      where: {
        repositoryId: "repository_1",
        status: "COMPLETED",
        generatedAt: { not: null }
      },
      orderBy: [
        { generatedAt: "desc" },
        { completedAt: "desc" },
        { createdAt: "desc" },
        { id: "desc" }
      ],
      select: { commitSha: true }
    });
    expect(state.lastAnalyzedCommitSha).toBe("commit-completed-analysis");
  });

  it("selects the deterministic latest repository ProjectContext during initialization", async () => {
    const { service, projectContextFindFirst } = createHarness({
      latestContext: { id: "context_latest", commitSha: "commit-context-latest" }
    });

    const state = await service.getOrInitialize("repository_1", "user_1");

    expect(projectContextFindFirst).toHaveBeenCalledWith({
      where: { repositoryId: "repository_1" },
      orderBy: [{ generatedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        commitSha: true
      }
    });
    expect(state.currentProjectContextId).toBe("context_latest");
    expect(state.currentContextCommitSha).toBe("commit-context-latest");
  });

  it("returns existing RepositoryState without recomputing or overwriting it", async () => {
    const existingState = createState({
      currentProjectContextId: "context_a",
      currentContextCommitSha: "commit-a"
    });
    const { service, create, scanFindFirst, analysisFindFirst, projectContextFindFirst } =
      createHarness({
        existingState,
        latestContext: { id: "context_b", commitSha: "commit-b" }
      });

    const state = await service.getOrInitialize("repository_1", "user_1");

    expect(state.currentProjectContextId).toBe("context_a");
    expect(state.currentContextCommitSha).toBe("commit-a");
    expect(create).not.toHaveBeenCalled();
    expect(scanFindFirst).not.toHaveBeenCalled();
    expect(analysisFindFirst).not.toHaveBeenCalled();
    expect(projectContextFindFirst).not.toHaveBeenCalled();
  });

  it("handles concurrent initialization through the repositoryId unique state constraint", async () => {
    const concurrentState = createState({ id: "state_concurrent" });
    const { service, create, findUnique } = createHarness();
    findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(concurrentState)
      .mockResolvedValueOnce(concurrentState);
    create.mockRejectedValueOnce(new Error("Unique constraint failed"));

    const state = await service.getOrInitialize("repository_1", "user_1");

    expect(state.id).toBe("state_concurrent");
  });

  it("resolves current ProjectContext through RepositoryState after ownership verification", async () => {
    const { service, projectContextFindUnique, getScanAccessMetadataForUser } = createHarness({
      existingState: createState({
        currentProjectContextId: "context_1",
        currentContextCommitSha: "commit-context"
      }),
      currentContext: createContext()
    });

    const context = await service.getCurrentProjectContext("repository_1", "user_1");

    expect(getScanAccessMetadataForUser).toHaveBeenCalledWith("user_1", "repository_1");
    expect(projectContextFindUnique).toHaveBeenCalledWith({
      where: { id: "context_1" }
    });
    expect(context).toMatchObject({
      id: "context_1",
      repositoryId: "repository_1",
      commitSha: "commit-context",
      contextVersion: "context-engine@5.7.1"
    });
  });

  it("does not resolve current ProjectContext across repository ownership boundaries", async () => {
    const { service, projectContextFindUnique } = createHarness({
      existingState: createState({ currentProjectContextId: "context_1" }),
      ownershipError: new NotFoundException("Repository was not found")
    });

    await expect(service.getCurrentProjectContext("repository_1", "user_2")).rejects.toBeInstanceOf(
      NotFoundException
    );
    expect(projectContextFindUnique).not.toHaveBeenCalled();
  });

  it("uses not-found semantics when no current ProjectContext pointer exists", async () => {
    const { service, projectContextFindUnique } = createHarness({
      existingState: createState({ currentProjectContextId: null })
    });

    await expect(service.getCurrentProjectContext("repository_1", "user_1")).rejects.toBeInstanceOf(
      NotFoundException
    );
    expect(projectContextFindUnique).not.toHaveBeenCalled();
  });

  it("handles a deleted current ProjectContext pointer safely", async () => {
    const { service } = createHarness({
      existingState: createState({ currentProjectContextId: "deleted_context" }),
      currentContext: null
    });

    await expect(service.getCurrentProjectContext("repository_1", "user_1")).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it("does not return a ProjectContext if the pointer resolves to another repository", async () => {
    const { service } = createHarness({
      existingState: createState({ currentProjectContextId: "context_2" }),
      currentContext: createContext({ id: "context_2", repositoryId: "repository_2" })
    });

    await expect(service.getCurrentProjectContext("repository_1", "user_1")).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it("backfills only repositories missing RepositoryState and never overwrites existing rows", async () => {
    const { service, repositoryFindMany, create } = createHarness({
      repositoryIdsWithoutState: ["repository_1", "repository_2"]
    });

    const result = await service.backfillMissingRepositoryStates();

    expect(repositoryFindMany).toHaveBeenCalledWith({
      where: { state: null },
      select: { id: true }
    });
    expect(create).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ createdCount: 2, skippedCount: 0 });
  });
});

type RepositoryStateRecord = {
  id: string;
  repositoryId: string;
  remoteHeadCommitSha: string | null;
  remoteHeadCheckedAt: Date | null;
  lastScannedCommitSha: string | null;
  lastAnalyzedCommitSha: string | null;
  currentProjectContextId: string | null;
  currentContextCommitSha: string | null;
  freshnessStatus: RepositoryFreshnessStatus;
  lastUpdateStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ProjectContextRecord = {
  id: string;
  contextId: string;
  analysisId: string;
  scanId: string;
  repositoryId: string;
  commitSha: string;
  contextVersion: string;
  generatedAt: Date;
  snapshot: Record<string, unknown>;
  createdAt: Date;
};
