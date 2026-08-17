import "reflect-metadata";

import { describe, expect, it, vi } from "vitest";

import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../../auth/guards/roles.guard.js";
import type { AuthenticatedUser } from "../../auth/types/authenticated-user.js";
import type { GenerateAndPersistProjectContextService } from "../application/generate-and-persist-project-context.service.js";
import type { GetAnalysisProjectContextsService } from "../application/get-analysis-project-contexts.service.js";
import type { PersistedProjectContext } from "../domain/contracts/project-context-repository.contract.js";
import { ProjectContext } from "../domain/project-context.js";
import { AnalysisContextController } from "./analysis-context.controller.js";

const GUARDS_METADATA = "__guards__";
const API_SECURITY_METADATA = "swagger/apiSecurity";

const user = { id: "user_1" } as AuthenticatedUser;
const firstContext = ProjectContext.create({
  contextId: "context_1",
  analysisId: "analysis_1",
  scanId: "scan_1",
  repositoryId: "repository_1",
  commitSha: "abc123",
  contextVersion: "context-engine@5.7.1",
  generatedAt: new Date("2026-08-17T10:00:00.000Z")
});
const secondContext = ProjectContext.create({
  ...firstContext.toSnapshot(),
  contextId: "context_2",
  generatedAt: new Date("2026-08-17T10:05:00.000Z")
});

function persisted(
  id: string,
  context: ProjectContext,
  createdAt: string
): PersistedProjectContext {
  return {
    id,
    contextId: context.contextId,
    analysisId: context.analysisId,
    scanId: context.scanId,
    repositoryId: context.repositoryId,
    commitSha: context.commitSha,
    contextVersion: context.contextVersion,
    generatedAt: context.generatedAt,
    createdAt: new Date(createdAt),
    context
  };
}

describe("AnalysisContextController", () => {
  it("uses the existing Auth guard mechanism and Swagger bearer auth", () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, AnalysisContextController) as unknown[];
    const security = Reflect.getMetadata(API_SECURITY_METADATA, AnalysisContextController) as Array<
      Record<string, string[]>
    >;

    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
    expect(security).toContainEqual({ bearer: [] });
  });

  it("returns latest Context for an authorized Analysis", async () => {
    const latest = persisted("project_context_2", secondContext, "2026-08-17T10:05:01.000Z");
    const getAnalysisProjectContextsService = {
      getLatest: vi.fn(async () => latest),
      getHistory: vi.fn()
    } as unknown as GetAnalysisProjectContextsService;
    const generateAndPersistProjectContextService = {
      generate: vi.fn()
    } as unknown as GenerateAndPersistProjectContextService;
    const controller = new AnalysisContextController(
      getAnalysisProjectContextsService,
      generateAndPersistProjectContextService
    );

    await expect(controller.getLatest(user, { analysisId: "analysis_1" })).resolves.toMatchObject({
      id: "project_context_2",
      contextId: "context_2",
      generatedAt: "2026-08-17T10:05:00.000Z"
    });
    expect(getAnalysisProjectContextsService.getLatest).toHaveBeenCalledWith({
      userId: "user_1",
      analysisId: "analysis_1"
    });
  });

  it("returns deterministic Context history summaries", async () => {
    const history = [
      persisted("project_context_2", secondContext, "2026-08-17T10:05:01.000Z"),
      persisted("project_context_1", firstContext, "2026-08-17T10:00:01.000Z")
    ];
    const getAnalysisProjectContextsService = {
      getLatest: vi.fn(),
      getHistory: vi.fn(async () => history)
    } as unknown as GetAnalysisProjectContextsService;
    const generateAndPersistProjectContextService = {
      generate: vi.fn()
    } as unknown as GenerateAndPersistProjectContextService;
    const controller = new AnalysisContextController(
      getAnalysisProjectContextsService,
      generateAndPersistProjectContextService
    );

    await expect(controller.getHistory(user, { analysisId: "analysis_1" })).resolves.toEqual({
      items: [
        expect.objectContaining({ id: "project_context_2" }),
        expect.objectContaining({ id: "project_context_1" })
      ]
    });
  });

  it("generate again returns a newly persisted immutable Context", async () => {
    const generated = persisted("project_context_2", secondContext, "2026-08-17T10:05:01.000Z");
    const getAnalysisProjectContextsService = {
      getLatest: vi.fn(),
      getHistory: vi.fn()
    } as unknown as GetAnalysisProjectContextsService;
    const generateAndPersistProjectContextService = {
      generate: vi.fn(async () => generated)
    } as unknown as GenerateAndPersistProjectContextService;
    const controller = new AnalysisContextController(
      getAnalysisProjectContextsService,
      generateAndPersistProjectContextService
    );

    await expect(controller.generate(user, { analysisId: "analysis_1" })).resolves.toMatchObject({
      id: "project_context_2",
      contextId: "context_2"
    });
    expect(generateAndPersistProjectContextService.generate).toHaveBeenCalledWith({
      userId: "user_1",
      analysisId: "analysis_1"
    });
  });
});
