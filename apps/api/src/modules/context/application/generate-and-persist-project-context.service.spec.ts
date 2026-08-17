import { describe, expect, it, vi } from "vitest";

import type { PersistedProjectContext } from "../domain/contracts/project-context-repository.contract.js";
import { ProjectContext } from "../domain/project-context.js";
import { GenerateAndPersistProjectContextService } from "./generate-and-persist-project-context.service.js";
import type { GenerateProjectContextService } from "./generate-project-context.service.js";
import type { PersistProjectContextService } from "./persist-project-context.service.js";

const context = ProjectContext.create({
  contextId: "context_1",
  analysisId: "analysis_1",
  scanId: "scan_1",
  repositoryId: "repository_1",
  commitSha: "abc123",
  contextVersion: "context-engine@5.7.1",
  generatedAt: new Date("2026-08-17T10:00:00.000Z")
});

const persisted = {
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
} satisfies PersistedProjectContext;

describe("GenerateAndPersistProjectContextService", () => {
  it("generates through the existing Context path, then persists the canonical ProjectContext", async () => {
    const generateProjectContextService = {
      generate: vi.fn(async () => context)
    } as unknown as GenerateProjectContextService;
    const persistProjectContextService = {
      save: vi.fn(async () => persisted)
    } as unknown as PersistProjectContextService;
    const service = new GenerateAndPersistProjectContextService(
      generateProjectContextService,
      persistProjectContextService
    );

    await expect(service.generate({ userId: "user_1", analysisId: "analysis_1" })).resolves.toBe(
      persisted
    );
    expect(generateProjectContextService.generate).toHaveBeenCalledWith({
      userId: "user_1",
      analysisId: "analysis_1"
    });
    expect(persistProjectContextService.save).toHaveBeenCalledWith(context);
  });
});
