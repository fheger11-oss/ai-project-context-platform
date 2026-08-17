import { describe, expect, it, vi } from "vitest";

import type {
  PersistedProjectContext,
  ProjectContextRepository
} from "../domain/contracts/project-context-repository.contract.js";
import { ProjectContext } from "../domain/project-context.js";
import { PersistProjectContextService } from "./persist-project-context.service.js";

const context = ProjectContext.create({
  contextId: "context_1",
  analysisId: "analysis_1",
  scanId: "scan_1",
  repositoryId: "repository_1",
  commitSha: "abc123",
  contextVersion: "context-engine@5.7.1",
  generatedAt: new Date("2026-08-17T10:00:00.000Z")
});

const persisted: PersistedProjectContext = {
  id: "project_context_1",
  contextId: context.contextId,
  analysisId: context.analysisId,
  scanId: context.scanId,
  repositoryId: context.repositoryId,
  commitSha: context.commitSha,
  contextVersion: context.contextVersion,
  generatedAt: context.generatedAt,
  createdAt: new Date("2026-08-17T10:00:01.000Z"),
  context
};

function createService() {
  const repository = {
    save: vi.fn(async () => persisted),
    findById: vi.fn(async () => persisted),
    listByAnalysisId: vi.fn(async () => [persisted]),
    findLatestByAnalysisId: vi.fn(async () => persisted)
  } as unknown as ProjectContextRepository;

  return {
    repository,
    service: new PersistProjectContextService(repository)
  };
}

describe("PersistProjectContextService", () => {
  it("saves ProjectContext through the repository contract", async () => {
    const { service, repository } = createService();

    await expect(service.save(context)).resolves.toBe(persisted);
    expect(repository.save).toHaveBeenCalledWith(context);
  });

  it("retrieves ProjectContext lifecycle history through the repository contract", async () => {
    const { service, repository } = createService();

    await expect(service.findById("project_context_1")).resolves.toBe(persisted);
    await expect(service.listByAnalysisId("analysis_1")).resolves.toEqual([persisted]);
    await expect(service.findLatestByAnalysisId("analysis_1")).resolves.toBe(persisted);
    expect(repository.findById).toHaveBeenCalledWith("project_context_1");
    expect(repository.listByAnalysisId).toHaveBeenCalledWith("analysis_1");
    expect(repository.findLatestByAnalysisId).toHaveBeenCalledWith("analysis_1");
  });
});
