import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { AnalysisResult } from "../../analysis/domain/contracts/analysis-result.contract.js";
import type { GetAnalysisResultService } from "../../analysis/application/get-analysis-result.service.js";
import type { PersistedProjectContext } from "../domain/contracts/project-context-repository.contract.js";
import { ProjectContext } from "../domain/project-context.js";
import type { PersistProjectContextService } from "./persist-project-context.service.js";
import { GetAnalysisProjectContextsService } from "./get-analysis-project-contexts.service.js";

const analysis = {
  analysisId: "analysis_1",
  repositoryId: "repository_1"
} as AnalysisResult;

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

function createService(options: { latest?: PersistedProjectContext | null } = {}) {
  const getAnalysisResultService = {
    get: vi.fn(async () => analysis)
  } as unknown as GetAnalysisResultService;
  const persistProjectContextService = {
    findLatestByAnalysisId: vi.fn(async () =>
      Object.hasOwn(options, "latest") ? options.latest : persisted
    ),
    listByAnalysisId: vi.fn(async () => [persisted])
  } as unknown as PersistProjectContextService;

  return {
    getAnalysisResultService,
    persistProjectContextService,
    service: new GetAnalysisProjectContextsService(
      getAnalysisResultService,
      persistProjectContextService
    )
  };
}

describe("GetAnalysisProjectContextsService", () => {
  it("gets latest Context after verifying Analysis ownership", async () => {
    const { service, getAnalysisResultService, persistProjectContextService } = createService();

    await expect(service.getLatest({ userId: "user_1", analysisId: "analysis_1" })).resolves.toBe(
      persisted
    );
    expect(getAnalysisResultService.get).toHaveBeenCalledWith({
      userId: "user_1",
      analysisId: "analysis_1"
    });
    expect(persistProjectContextService.findLatestByAnalysisId).toHaveBeenCalledWith("analysis_1");
  });

  it("gets history after verifying Analysis ownership", async () => {
    const { service, persistProjectContextService } = createService();

    await expect(
      service.getHistory({ userId: "user_1", analysisId: "analysis_1" })
    ).resolves.toEqual([persisted]);
    expect(persistProjectContextService.listByAnalysisId).toHaveBeenCalledWith("analysis_1");
  });

  it("rejects missing latest Context without fabricating an empty Context", async () => {
    const { service } = createService({ latest: null });

    await expect(service.getLatest({ userId: "user_1", analysisId: "analysis_1" })).rejects.toThrow(
      NotFoundException
    );
  });
});
