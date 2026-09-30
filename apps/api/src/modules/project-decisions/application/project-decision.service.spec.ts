import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RepositoriesService } from "../../repositories/repositories.service.js";
import type {
  ProjectDecisionRecord,
  ProjectDecisionRepository
} from "../domain/contracts/project-decision-repository.contract.js";
import { ProjectDecisionService } from "./project-decision.service.js";

const SHA = "a".repeat(40);
const now = new Date("2026-09-30T10:00:00.000Z");
const record: ProjectDecisionRecord = {
  id: "decision0001",
  repositoryId: "repository01",
  title: "Database",
  decision: "Use managed Postgres.",
  rationale: "Reduce operational overhead.",
  affectedArea: "Infrastructure",
  status: "ACTIVE",
  decidedAt: now,
  sourceProjectContextId: null,
  sourceRepositoryUpdateId: null,
  sourceCommitSha: null,
  createdAt: now,
  updatedAt: now
};

function harness() {
  const repository = {
    create: vi.fn(async (input) => ({ ...record, ...input })),
    findByRepositoryAndId: vi.fn(async () => record),
    listByRepository: vi.fn(async () => ({ items: [record], total: 1 })),
    updateByRepositoryAndId: vi.fn(async (_repositoryId, _id, _expectedStatus, input) => ({
      ...record,
      ...input
    })),
    findProjectContextSource: vi.fn(async () => null),
    findRepositoryUpdateSource: vi.fn(async () => null),
    repositoryHasCommit: vi.fn(async () => true)
  } as unknown as ProjectDecisionRepository;
  const ownership = vi.fn(async () => ({ id: "repository01" }));
  const service = new ProjectDecisionService(repository, {
    getScanAccessMetadataForUser: ownership
  } as unknown as RepositoriesService);
  return { service, repository, ownership };
}

const createRequest = {
  title: "  Database  ",
  decision: " Use managed Postgres. ",
  rationale: " Reduce operational overhead. ",
  affectedArea: " Infrastructure ",
  decidedAt: now.toISOString()
};

describe("ProjectDecisionService", () => {
  let h: ReturnType<typeof harness>;
  beforeEach(() => (h = harness()));

  it("creates an explicitly authored ACTIVE decision without provenance", async () => {
    await expect(h.service.create("user_1", "repository01", createRequest)).resolves.toMatchObject({
      status: "ACTIVE",
      title: "Database"
    });
    expect(h.repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ repositoryId: "repository01", sourceCommitSha: null })
    );
  });

  it("enforces ownership for list, create, get, and update", async () => {
    await h.service.list({ userId: "user_1", repositoryId: "repository01", page: 1, pageSize: 10 });
    await h.service.create("user_1", "repository01", createRequest);
    await h.service.get("user_1", "repository01", "decision0001");
    await h.service.update("user_1", "repository01", "decision0001", { title: "Corrected" });
    expect(h.ownership).toHaveBeenCalledTimes(4);
  });

  it.each([
    [
      "list",
      (service: ProjectDecisionService) =>
        service.list({
          userId: "other",
          repositoryId: "repository01",
          page: 1,
          pageSize: 10
        })
    ],
    [
      "create",
      (service: ProjectDecisionService) => service.create("other", "repository01", createRequest)
    ],
    [
      "get",
      (service: ProjectDecisionService) => service.get("other", "repository01", "decision0001")
    ],
    [
      "update",
      (service: ProjectDecisionService) =>
        service.update("other", "repository01", "decision0001", { title: "No access" })
    ]
  ] as const)(
    "rejects non-owner %s access before decision persistence",
    async (_operation, run) => {
      h.ownership.mockRejectedValue(new NotFoundException("Repository was not found"));
      await expect(run(h.service)).rejects.toBeInstanceOf(NotFoundException);
      expect(h.repository.listByRepository).not.toHaveBeenCalled();
      expect(h.repository.create).not.toHaveBeenCalled();
      expect(h.repository.findByRepositoryAndId).not.toHaveBeenCalled();
      expect(h.repository.updateByRepositoryAndId).not.toHaveBeenCalled();
    }
  );

  it("rejects a cross-repository decision ID through repository-scoped lookup", async () => {
    vi.mocked(h.repository.findByRepositoryAndId).mockResolvedValue(null);
    await expect(h.service.get("user_1", "repository01", "decisionOther")).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it.each([
    ["ACTIVE", "SUPERSEDED"],
    ["ACTIVE", "ARCHIVED"],
    ["ARCHIVED", "ACTIVE"]
  ] as const)("updates lifecycle from %s to %s", async (from, to) => {
    vi.mocked(h.repository.findByRepositoryAndId).mockResolvedValue({ ...record, status: from });
    await expect(
      h.service.update("user_1", "repository01", "decision0001", { status: to })
    ).resolves.toMatchObject({ status: to });
  });

  it.each(["ACTIVE", "ARCHIVED"] as const)("rejects SUPERSEDED to %s", async (status) => {
    vi.mocked(h.repository.findByRepositoryAndId).mockResolvedValue({
      ...record,
      status: "SUPERSEDED"
    });
    await expect(
      h.service.update("user_1", "repository01", "decision0001", { status })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    ["SUPERSEDED", "ARCHIVED"],
    ["ARCHIVED", "SUPERSEDED"]
  ] as const)(
    "does not let a stale ACTIVE transition overwrite a concurrent %s winner with %s",
    async (winningStatus, staleStatus) => {
      let persistedStatus: ProjectDecisionRecord["status"] = "ACTIVE";
      vi.mocked(h.repository.findByRepositoryAndId).mockResolvedValue(record);
      vi.mocked(h.repository.updateByRepositoryAndId).mockImplementation(
        async (_repositoryId, _id, expectedStatus, input) => {
          if (persistedStatus !== expectedStatus) return null;
          persistedStatus = input.status ?? persistedStatus;
          return { ...record, ...input, status: persistedStatus };
        }
      );

      await expect(
        h.service.update("user_1", "repository01", "decision0001", {
          status: winningStatus
        })
      ).resolves.toMatchObject({ status: winningStatus });
      await expect(
        h.service.update("user_1", "repository01", "decision0001", { status: staleStatus })
      ).rejects.toBeInstanceOf(ConflictException);
      expect(persistedStatus).toBe(winningStatus);
    }
  );

  it.each(["ACTIVE", "ARCHIVED", "SUPERSEDED"] as const)(
    "keeps idempotent %s status updates valid",
    async (status) => {
      vi.mocked(h.repository.findByRepositoryAndId).mockResolvedValue({ ...record, status });
      await expect(
        h.service.update("user_1", "repository01", "decision0001", { status })
      ).resolves.toMatchObject({ status });
      expect(h.repository.updateByRepositoryAndId).toHaveBeenCalledWith(
        "repository01",
        "decision0001",
        status,
        { status }
      );
    }
  );

  it("accepts matching same-repository context, update, and commit provenance", async () => {
    vi.mocked(h.repository.findProjectContextSource).mockResolvedValue({
      id: "context0001",
      commitSha: SHA
    });
    vi.mocked(h.repository.findRepositoryUpdateSource).mockResolvedValue({
      id: "update00001",
      targetCommitSha: SHA
    });
    await expect(
      h.service.create("user_1", "repository01", {
        ...createRequest,
        sourceProjectContextId: "context0001",
        sourceRepositoryUpdateId: "update00001",
        sourceCommitSha: SHA
      })
    ).resolves.toBeDefined();
  });

  it.each(["context", "update"])(
    "rejects an invalid or cross-repository %s source",
    async (kind) => {
      await expect(
        h.service.create("user_1", "repository01", {
          ...createRequest,
          ...(kind === "context"
            ? { sourceProjectContextId: "context0001" }
            : { sourceRepositoryUpdateId: "update00001" })
        })
      ).rejects.toBeInstanceOf(BadRequestException);
    }
  );

  it("rejects conflicting provenance commits", async () => {
    vi.mocked(h.repository.findProjectContextSource).mockResolvedValue({
      id: "context0001",
      commitSha: SHA
    });
    vi.mocked(h.repository.findRepositoryUpdateSource).mockResolvedValue({
      id: "update00001",
      targetCommitSha: "b".repeat(40)
    });
    await expect(
      h.service.create("user_1", "repository01", {
        ...createRequest,
        sourceProjectContextId: "context0001",
        sourceRepositoryUpdateId: "update00001"
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects a structurally valid commit not known to the route repository", async () => {
    vi.mocked(h.repository.repositoryHasCommit).mockResolvedValue(false);
    await expect(
      h.service.create("user_1", "repository01", { ...createRequest, sourceCommitSha: SHA })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("returns pagination metadata and passes status filtering through", async () => {
    await expect(
      h.service.list({
        userId: "user_1",
        repositoryId: "repository01",
        status: "ARCHIVED",
        page: 1,
        pageSize: 10
      })
    ).resolves.toMatchObject({ pagination: { total: 1, hasNextPage: false } });
    expect(h.repository.listByRepository).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ARCHIVED" })
    );
  });
});
