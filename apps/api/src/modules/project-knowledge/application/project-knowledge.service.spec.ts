import { ConflictException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type {
  ProjectKnowledgeRecord,
  ProjectKnowledgeRepository
} from "../domain/contracts/project-knowledge-repository.contract.js";
import { ProjectKnowledgeService } from "./project-knowledge.service.js";

const item: ProjectKnowledgeRecord = {
  id: "k1",
  repositoryId: "r1",
  content: "Uses PostgreSQL",
  status: "ACTIVE",
  origin: "USER_AUTHORED",
  kind: "USER_ASSERTED",
  sourceType: "USER",
  confidence: null,
  sourceProjectContextId: null,
  sourceProjectDecisionId: null,
  verifiedAt: null,
  createdAt: new Date("2026-10-01T00:00:00Z"),
  updatedAt: new Date("2026-10-01T00:00:00Z")
};
function setup(overrides: Partial<ProjectKnowledgeRepository> = {}) {
  const repository: ProjectKnowledgeRepository = {
    create: vi.fn().mockResolvedValue(item),
    findByRepositoryAndId: vi.fn().mockResolvedValue(item),
    listByRepository: vi.fn().mockResolvedValue({ items: [item], total: 1 }),
    updateByRepositoryAndId: vi.fn().mockResolvedValue({ ...item, status: "ARCHIVED" }),
    ...overrides
  };
  const repositories = { getScanAccessMetadataForUser: vi.fn().mockResolvedValue({}) };
  return {
    service: new ProjectKnowledgeService(repository, repositories as never),
    repository,
    repositories
  };
}
describe("ProjectKnowledgeService", () => {
  it("creates only truthful user-authored knowledge and permits duplicate content as separate identities", async () => {
    const { service, repository } = setup();
    await service.create("u1", "r1", { content: " Uses PostgreSQL " });
    await service.create("u1", "r1", { content: "Uses PostgreSQL" });
    expect(repository.create).toHaveBeenCalledTimes(2);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        repositoryId: "r1",
        content: "Uses PostgreSQL",
        origin: "USER_AUTHORED",
        kind: "USER_ASSERTED",
        sourceType: "USER"
      })
    );
  });
  it("scopes reads and writes after ownership checks", async () => {
    const { service, repository, repositories } = setup();
    await service.list({
      userId: "u1",
      repositoryId: "r1",
      status: "ACTIVE",
      page: 1,
      pageSize: 10
    });
    await service.update("u1", "r1", "k1", { status: "ARCHIVED" });
    expect(repositories.getScanAccessMetadataForUser).toHaveBeenCalledWith("u1", "r1");
    expect(repository.findByRepositoryAndId).toHaveBeenCalledWith("r1", "k1");
    expect(repository.updateByRepositoryAndId).toHaveBeenCalledWith("r1", "k1", "ACTIVE", {
      status: "ARCHIVED"
    });
  });
  it("returns conflict when the compare-and-set update loses", async () => {
    const { service } = setup({ updateByRepositoryAndId: vi.fn().mockResolvedValue(null) });
    await expect(service.update("u1", "r1", "k1", { status: "ARCHIVED" })).rejects.toBeInstanceOf(
      ConflictException
    );
  });
});
