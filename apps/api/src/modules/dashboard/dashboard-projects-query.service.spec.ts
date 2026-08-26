import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../prisma/prisma.service.js";
import { DashboardProjectsQueryService } from "./dashboard-projects-query.service.js";

const baseRepository = {
  id: "repository_1",
  name: "project",
  fullName: "owner/project",
  owner: "owner",
  description: "Project description",
  defaultBranch: "main",
  visibility: "PRIVATE" as const,
  language: "TypeScript",
  isArchived: false,
  lastSyncedAt: new Date("2026-08-26T10:00:00.000Z")
};

const scan = {
  id: "scan_1",
  status: "COMPLETED" as const,
  commitSha: "abc123",
  createdAt: new Date("2026-08-26T10:01:00.000Z"),
  updatedAt: new Date("2026-08-26T10:02:00.000Z"),
  completedAt: new Date("2026-08-26T10:02:00.000Z"),
  totalFiles: 42,
  totalSize: 2048n
};

const context = {
  id: "project_context_1",
  contextId: "context:analysis_1:context-engine@1",
  contextVersion: "context-engine@1",
  generatedAt: new Date("2026-08-26T10:04:00.000Z"),
  createdAt: new Date("2026-08-26T10:04:01.000Z"),
  _count: {
    documents: 2
  }
};

const analysis = {
  id: "analysis_1",
  scanId: "scan_1",
  analyzerVersion: "analysis-engine@1",
  commitSha: "abc123",
  generatedAt: new Date("2026-08-26T10:03:00.000Z"),
  projectContexts: [] as (typeof context)[]
};

function repository(
  overrides: {
    analyses?: (typeof analysis)[];
    id?: string;
    scans?: (typeof scan)[];
  } = {}
) {
  return {
    ...baseRepository,
    id: overrides.id ?? baseRepository.id,
    scans: overrides.scans ?? [],
    analyses: overrides.analyses ?? []
  };
}

function createService(records: ReturnType<typeof repository>[]) {
  const findMany = vi.fn(async (args: { where: { userId: string } }) =>
    records.filter(
      (record) => record.id !== "other_user_repository" && args.where.userId === "user_1"
    )
  );
  const prisma = {
    repository: {
      findMany
    }
  } as unknown as PrismaService;

  return {
    findMany,
    service: new DashboardProjectsQueryService(prisma)
  };
}

describe("DashboardProjectsQueryService", () => {
  it("returns an empty project list for users without repositories", async () => {
    const { service } = createService([]);

    await expect(service.listProjects("user_1")).resolves.toEqual({ projects: [] });
  });

  it("queries only repositories owned by the authenticated user", async () => {
    const { findMany, service } = createService([repository()]);

    await service.listProjects("user_1");

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user_1" }
      })
    );
  });

  it("does not return another user's repository from the scoped read", async () => {
    const { service } = createService([repository(), repository({ id: "other_user_repository" })]);

    const response = await service.listProjects("user_1");

    expect(response.projects).toHaveLength(1);
    expect(response.projects[0]?.repository.id).toBe("repository_1");
  });

  it("represents a repository without scans correctly", async () => {
    const { service } = createService([repository()]);

    const response = await service.listProjects("user_1");

    expect(response.projects[0]).toMatchObject({
      repository: {
        id: "repository_1",
        name: "project",
        owner: "owner",
        visibility: "PRIVATE",
        defaultBranch: "main",
        description: "Project description",
        language: "TypeScript",
        isArchived: false,
        lastSyncedAt: "2026-08-26T10:00:00.000Z"
      },
      latestScan: null,
      latestAnalysis: null,
      latestContext: null,
      documents: {
        available: false,
        count: 0
      },
      aiExport: {
        available: false
      }
    });
  });

  it("represents a repository with a scan but no completed analysis", async () => {
    const { service } = createService([repository({ scans: [scan] })]);

    const response = await service.listProjects("user_1");

    expect(response.projects[0]?.latestScan).toEqual({
      id: "scan_1",
      status: "COMPLETED",
      commitSha: "abc123",
      createdAt: "2026-08-26T10:01:00.000Z",
      updatedAt: "2026-08-26T10:02:00.000Z",
      completedAt: "2026-08-26T10:02:00.000Z",
      totalFiles: 42,
      totalSize: "2048"
    });
    expect(response.projects[0]?.latestAnalysis).toBeNull();
    expect(response.projects[0]?.latestContext).toBeNull();
  });

  it("represents a repository with analysis but no context", async () => {
    const { service } = createService([repository({ scans: [scan], analyses: [analysis] })]);

    const response = await service.listProjects("user_1");

    expect(response.projects[0]?.latestAnalysis).toEqual({
      analysisId: "analysis_1",
      scanId: "scan_1",
      analyzerVersion: "analysis-engine@1",
      commitSha: "abc123",
      generatedAt: "2026-08-26T10:03:00.000Z"
    });
    expect(response.projects[0]?.latestContext).toBeNull();
    expect(response.projects[0]?.aiExport.available).toBe(false);
  });

  it("exposes context availability, context version, document count, and AI export availability", async () => {
    const { service } = createService([
      repository({
        scans: [scan],
        analyses: [
          {
            ...analysis,
            projectContexts: [context]
          }
        ]
      })
    ]);

    const response = await service.listProjects("user_1");

    expect(response.projects[0]?.latestContext).toEqual({
      id: "project_context_1",
      contextId: "context:analysis_1:context-engine@1",
      contextVersion: "context-engine@1",
      generatedAt: "2026-08-26T10:04:00.000Z",
      createdAt: "2026-08-26T10:04:01.000Z"
    });
    expect(response.projects[0]?.documents).toEqual({
      available: true,
      count: 2
    });
    expect(response.projects[0]?.aiExport).toEqual({
      available: true
    });
  });

  it("uses one database projection instead of per-repository reads", async () => {
    const { findMany, service } = createService([
      repository({ id: "repository_1" }),
      repository({ id: "repository_2" })
    ]);

    await service.listProjects("user_1");

    expect(findMany).toHaveBeenCalledTimes(1);
  });
});
