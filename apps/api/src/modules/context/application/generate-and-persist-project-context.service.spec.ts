import { describe, expect, it, vi } from "vitest";

import type { ContextGenerator } from "../domain/contracts/context-generator.contract.js";
import type { PersistedProjectContext } from "../domain/contracts/project-context-repository.contract.js";
import { ProjectContext } from "../domain/project-context.js";
import { GenerateAndPersistProjectContextService } from "./generate-and-persist-project-context.service.js";
import type { PersistProjectContextService } from "./persist-project-context.service.js";
import type { ReadContextInputService } from "./read-context-input.service.js";
import type { OperationLockService } from "../../usage/operation-lock.service.js";
import type { UsageService } from "../../usage/usage.service.js";

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
    const persistProjectContextService = {
      save: vi.fn(async () => persisted)
    } as unknown as PersistProjectContextService;
    const readContextInputService = {
      read: vi.fn(async () => ({ analysis: {} }))
    } as unknown as ReadContextInputService;
    const contextGenerator = {
      generate: vi.fn(async () => context)
    } as unknown as ContextGenerator;
    const usageService = {
      assertMonthlyQuota: vi.fn(async () => undefined)
    } as unknown as UsageService;
    const operationLockService = {
      withRenewingLocks: vi.fn(async (_locks, operation: () => Promise<unknown>) => operation())
    } as unknown as OperationLockService;
    const service = new GenerateAndPersistProjectContextService(
      persistProjectContextService,
      readContextInputService,
      contextGenerator,
      usageService,
      operationLockService
    );

    await expect(service.generate({ userId: "user_1", analysisId: "analysis_1" })).resolves.toBe(
      persisted
    );
    expect(readContextInputService.read).toHaveBeenCalledWith({
      userId: "user_1",
      analysisId: "analysis_1"
    });
    expect(usageService.assertMonthlyQuota).toHaveBeenCalledWith({
      userId: "user_1",
      resource: "contexts",
      limit: 3
    });
    expect(persistProjectContextService.save).toHaveBeenCalledWith(context);
  });
});
