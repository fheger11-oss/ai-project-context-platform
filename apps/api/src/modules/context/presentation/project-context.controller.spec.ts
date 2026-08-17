import "reflect-metadata";

import { describe, expect, it, vi } from "vitest";

import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../../auth/guards/roles.guard.js";
import type { AuthenticatedUser } from "../../auth/types/authenticated-user.js";
import type { PersistedProjectContext } from "../domain/contracts/project-context-repository.contract.js";
import { ProjectContext } from "../domain/project-context.js";
import type { GetProjectContextService } from "../application/get-project-context.service.js";
import { ProjectContextController } from "./project-context.controller.js";

const GUARDS_METADATA = "__guards__";
const API_SECURITY_METADATA = "swagger/apiSecurity";

const user = { id: "user_1" } as AuthenticatedUser;
const context = ProjectContext.create({
  contextId: "context_1",
  analysisId: "analysis_1",
  scanId: "scan_1",
  repositoryId: "repository_1",
  commitSha: "abc123",
  contextVersion: "context-engine@5.7.1",
  generatedAt: new Date("2026-08-17T10:00:00.000Z"),
  project: {
    claims: [
      {
        value: { type: "PRIMARY_LANGUAGE", language: "TYPESCRIPT" },
        kind: "INFERRED",
        confidence: "HIGH",
        evidence: [
          { kind: "PROJECT_METADATA", reference: { kind: "PROJECT_METADATA", field: "languages" } }
        ]
      }
    ]
  }
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

describe("ProjectContextController", () => {
  it("uses the existing Auth guard mechanism and Swagger bearer auth", () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, ProjectContextController) as unknown[];
    const security = Reflect.getMetadata(API_SECURITY_METADATA, ProjectContextController) as Array<
      Record<string, string[]>
    >;

    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
    expect(security).toContainEqual({ bearer: [] });
  });

  it("returns a public ProjectContext response without Prisma record shape", async () => {
    const getProjectContextService = {
      get: vi.fn(async () => persisted)
    } as unknown as GetProjectContextService;
    const controller = new ProjectContextController(getProjectContextService);

    await expect(
      controller.getById(user, { contextId: "project_context_1" })
    ).resolves.toMatchObject({
      id: "project_context_1",
      contextId: "context_1",
      analysisId: "analysis_1",
      contextVersion: "context-engine@5.7.1",
      generatedAt: "2026-08-17T10:00:00.000Z",
      createdAt: "2026-08-17T10:00:01.000Z",
      project: {
        claims: [
          expect.objectContaining({
            kind: "INFERRED",
            confidence: "HIGH"
          })
        ]
      }
    });
    expect(getProjectContextService.get).toHaveBeenCalledWith({
      userId: "user_1",
      contextId: "project_context_1"
    });
  });
});
