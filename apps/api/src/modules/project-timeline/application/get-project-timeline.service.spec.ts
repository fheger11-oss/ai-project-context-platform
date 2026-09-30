import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { RepositoriesService } from "../../repositories/repositories.service.js";
import type {
  ProjectTimelineReader,
  ProjectTimelineSources
} from "../domain/contracts/project-timeline-reader.contract.js";
import { GetProjectTimelineService } from "./get-project-timeline.service.js";

const connectedAt = new Date("2026-09-01T08:00:00.000Z");
const sharedAt = new Date("2026-09-30T10:00:00.000Z");

function sources(overrides: Partial<ProjectTimelineSources> = {}): ProjectTimelineSources {
  return {
    repository: {
      id: "repository01",
      name: "ctxaro",
      fullName: "owner/ctxaro",
      createdAt: connectedAt
    },
    updates: [
      {
        id: "update00001",
        repositoryId: "repository01",
        triggerType: "WEBHOOK",
        status: "COMPLETED",
        baseCommitSha: "a".repeat(40),
        targetCommitSha: "b".repeat(40),
        startedAt: new Date("2026-09-29T09:01:00.000Z"),
        completedAt: new Date("2026-09-29T09:02:00.000Z"),
        failedAt: null,
        scanId: "scan000001",
        analysisId: "analysis0001",
        projectContextId: "context0001",
        createdAt: new Date("2026-09-29T09:00:00.000Z")
      }
    ],
    contextPromotions: [
      {
        id: "history0001",
        repositoryId: "repository01",
        createdAt: new Date("2026-09-28T08:00:00.000Z"),
        projectContext: {
          id: "context0002",
          contextId: "context:analysis0002:context-engine@1",
          contextVersion: "context-engine@1",
          generatedAt: new Date("2026-09-28T07:59:00.000Z"),
          commitSha: "c".repeat(40),
          scanId: "scan000002",
          analysisId: "analysis0002"
        }
      }
    ],
    decisions: [
      {
        id: "decision001",
        repositoryId: "repository01",
        title: "Database",
        affectedArea: "Infrastructure",
        status: "ARCHIVED",
        decidedAt: sharedAt,
        sourceProjectContextId: "context0002",
        sourceRepositoryUpdateId: null,
        sourceCommitSha: "c".repeat(40)
      }
    ],
    totals: { updates: 1, contextPromotions: 1, decisions: 1 },
    ...overrides
  };
}

function harness(sourceResult = sources()) {
  const readCandidates = vi.fn(async () => sourceResult);
  const ownership = vi.fn(async () => ({ id: "repository01" }));
  const service = new GetProjectTimelineService(
    { readCandidates } as unknown as ProjectTimelineReader,
    { getScanAccessMetadataForUser: ownership } as unknown as RepositoriesService
  );
  return { service, readCandidates, ownership };
}

describe("GetProjectTimelineService", () => {
  it("maps all four source types with ISO timestamps and explicit summaries", async () => {
    const result = await harness().service.get({
      userId: "user01",
      repositoryId: "repository01",
      page: 1,
      pageSize: 20
    });

    expect(result.items.map((item) => item.type)).toEqual([
      "DECISION_EFFECTIVE",
      "REPOSITORY_UPDATE",
      "CONTEXT_PROMOTED",
      "REPOSITORY_CONNECTED"
    ]);
    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "REPOSITORY_CONNECTED",
          occurredAt: connectedAt.toISOString(),
          repositoryFullName: "owner/ctxaro"
        }),
        expect.objectContaining({
          type: "REPOSITORY_UPDATE",
          occurredAt: "2026-09-29T09:00:00.000Z",
          completedAt: "2026-09-29T09:02:00.000Z",
          projectContextId: "context0001"
        }),
        expect.objectContaining({
          type: "CONTEXT_PROMOTED",
          sourceId: "history0001",
          contextVersion: "context-engine@1",
          generatedAt: "2026-09-28T07:59:00.000Z"
        }),
        expect.objectContaining({
          type: "DECISION_EFFECTIVE",
          occurredAt: sharedAt.toISOString(),
          decidedAt: sharedAt.toISOString(),
          status: "ARCHIVED"
        })
      ])
    );
  });

  it("uses occurredAt descending, type ascending, and sourceId descending ordering", async () => {
    const sourceResult = sources({
      updates: [
        {
          ...sources().updates[0]!,
          id: "updateZ",
          createdAt: sharedAt
        }
      ],
      contextPromotions: [
        {
          ...sources().contextPromotions[0]!,
          id: "historyA",
          createdAt: sharedAt
        }
      ],
      decisions: [
        { ...sources().decisions[0]!, id: "decisionA" },
        { ...sources().decisions[0]!, id: "decisionZ" }
      ],
      totals: { updates: 1, contextPromotions: 1, decisions: 2 }
    });

    const result = await harness(sourceResult).service.get({
      userId: "user01",
      repositoryId: "repository01",
      page: 1,
      pageSize: 20
    });

    expect(result.items.slice(0, 4).map((item) => `${item.type}:${item.sourceId}`)).toEqual([
      "CONTEXT_PROMOTED:historyA",
      "DECISION_EFFECTIVE:decisionZ",
      "DECISION_EFFECTIVE:decisionA",
      "REPOSITORY_UPDATE:updateZ"
    ]);
  });

  it("authorizes before reading and denies another user without source access", async () => {
    const h = harness();
    h.ownership.mockRejectedValue(new NotFoundException("Repository was not found"));

    await expect(
      h.service.get({
        userId: "otherUser",
        repositoryId: "repository01",
        page: 1,
        pageSize: 20
      })
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(h.readCandidates).not.toHaveBeenCalled();
  });

  it("does not emit a promoted context represented by the exact linked update context", async () => {
    const linkedContext = sources().updates[0]!.projectContextId!;
    const sourceResult = sources({
      contextPromotions: [
        {
          ...sources().contextPromotions[0]!,
          projectContext: {
            ...sources().contextPromotions[0]!.projectContext,
            id: linkedContext
          }
        }
      ],
      totals: { updates: 1, contextPromotions: 0, decisions: 1 }
    });

    const result = await harness(sourceResult).service.get({
      userId: "user01",
      repositoryId: "repository01",
      page: 1,
      pageSize: 20
    });

    expect(result.items.some((item) => item.type === "CONTEXT_PROMOTED")).toBe(false);
    expect(result.pagination.total).toBe(3);
  });

  it("requests enough bounded candidates and returns accurate page metadata", async () => {
    const sourceResult = sources({
      decisions: [
        { ...sources().decisions[0]!, id: "decision03", decidedAt: sharedAt },
        {
          ...sources().decisions[0]!,
          id: "decision02",
          decidedAt: new Date("2026-09-27T10:00:00.000Z")
        },
        {
          ...sources().decisions[0]!,
          id: "decision01",
          decidedAt: new Date("2026-09-26T10:00:00.000Z")
        }
      ],
      totals: { updates: 1, contextPromotions: 1, decisions: 3 }
    });
    const h = harness(sourceResult);

    const result = await h.service.get({
      userId: "user01",
      repositoryId: "repository01",
      page: 2,
      pageSize: 2
    });

    expect(h.readCandidates).toHaveBeenCalledWith({ repositoryId: "repository01", take: 4 });
    expect(result.items).toHaveLength(2);
    expect(result.pagination).toEqual({
      page: 2,
      pageSize: 2,
      total: 6,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true
    });
  });

  it("returns only the connection item for a repository without activity and supports empty pages", async () => {
    const sourceResult = sources({
      updates: [],
      contextPromotions: [],
      decisions: [],
      totals: { updates: 0, contextPromotions: 0, decisions: 0 }
    });
    const first = await harness(sourceResult).service.get({
      userId: "user01",
      repositoryId: "repository01",
      page: 1,
      pageSize: 20
    });
    const empty = await harness(sourceResult).service.get({
      userId: "user01",
      repositoryId: "repository01",
      page: 2,
      pageSize: 20
    });

    expect(first.items.map((item) => item.type)).toEqual(["REPOSITORY_CONNECTED"]);
    expect(first.pagination.total).toBe(1);
    expect(empty.items).toEqual([]);
    expect(empty.pagination.hasPreviousPage).toBe(true);
  });

  it("does not substitute a decision persistence update time for decidedAt", async () => {
    const result = await harness().service.get({
      userId: "user01",
      repositoryId: "repository01",
      page: 1,
      pageSize: 20
    });
    const decision = result.items.find((item) => item.type === "DECISION_EFFECTIVE");

    expect(decision?.occurredAt).toBe(sharedAt.toISOString());
    expect(decision).not.toHaveProperty("updatedAt");
  });

  it("fails if the authorized repository disappears before the projection read", async () => {
    const h = harness(sources({ repository: null }));
    await expect(
      h.service.get({
        userId: "user01",
        repositoryId: "repository01",
        page: 1,
        pageSize: 20
      })
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
