import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { RepositoryFreshnessStatus } from "../../generated/prisma/enums.js";
import { ProjectContext } from "../context/domain/project-context.js";
import type { RepositoriesService } from "./repositories.service.js";
import { RepositoriesController } from "./repositories.controller.js";
import type { RepositoryStateService } from "./repository-state.service.js";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.js";

const user: AuthenticatedUser = {
  id: "user_1",
  email: "owner@example.com",
  role: "USER",
  tenantId: null
};

describe("RepositoriesController RepositoryState endpoints", () => {
  it("returns an ownership-safe RepositoryState summary", async () => {
    const getOrInitialize = vi.fn(async () => ({
      id: "state_1",
      repositoryId: "repository_1",
      remoteHeadCommitSha: null,
      remoteHeadCheckedAt: null,
      lastScannedCommitSha: "commit-scan",
      lastAnalyzedCommitSha: "commit-analysis",
      currentProjectContextId: "context_1",
      currentContextCommitSha: "commit-context",
      freshnessStatus: RepositoryFreshnessStatus.UNKNOWN,
      lastUpdateStatus: null,
      createdAt: new Date("2026-09-22T12:00:00.000Z"),
      updatedAt: new Date("2026-09-22T12:00:00.000Z")
    }));
    const controller = createController({ getOrInitialize });

    const response = await controller.getState(user, { id: "repository_1" });

    expect(getOrInitialize).toHaveBeenCalledWith("repository_1", "user_1");
    expect(response).toEqual({
      repositoryId: "repository_1",
      freshnessStatus: "UNKNOWN",
      remoteHeadCommitSha: null,
      remoteHeadCheckedAt: null,
      lastScannedCommitSha: "commit-scan",
      lastAnalyzedCommitSha: "commit-analysis",
      currentProjectContextId: "context_1",
      currentContextCommitSha: "commit-context",
      lastUpdateStatus: null
    });
    expect(response).not.toHaveProperty("id");
  });

  it("propagates ownership-safe not-found behavior for RepositoryState reads", async () => {
    const getOrInitialize = vi.fn(async () => {
      throw new NotFoundException("Repository was not found");
    });
    const controller = createController({ getOrInitialize });

    await expect(controller.getState(user, { id: "repository_2" })).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it("returns the current ProjectContext through RepositoryState", async () => {
    const getCurrentProjectContext = vi.fn(async () => createPersistedContext());
    const controller = createController({ getCurrentProjectContext });

    const response = await controller.getCurrentContext(user, { id: "repository_1" });

    expect(getCurrentProjectContext).toHaveBeenCalledWith("repository_1", "user_1");
    expect(response).toMatchObject({
      id: "context_1",
      contextId: "ctxaro_context_1",
      analysisId: "analysis_1",
      scanId: "scan_1",
      repositoryId: "repository_1",
      commitSha: "commit-context",
      contextVersion: "context-engine@5.7.1",
      generatedAt: "2026-09-22T12:00:00.000Z",
      createdAt: "2026-09-22T12:00:01.000Z"
    });
    expect(response.project).toEqual({ claims: [] });
  });

  it("propagates current-context not-found behavior without fallback lookup", async () => {
    const getCurrentProjectContext = vi.fn(async () => {
      throw new NotFoundException("Current ProjectContext was not found");
    });
    const controller = createController({ getCurrentProjectContext });

    await expect(
      controller.getCurrentContext(user, { id: "repository_without_context" })
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function createController(
  repositoryStateService: Partial<RepositoryStateService>
): RepositoriesController {
  return new RepositoriesController(
    {} as RepositoriesService,
    repositoryStateService as RepositoryStateService
  );
}

function createPersistedContext() {
  const generatedAt = new Date("2026-09-22T12:00:00.000Z");

  return {
    id: "context_1",
    contextId: "ctxaro_context_1",
    analysisId: "analysis_1",
    scanId: "scan_1",
    repositoryId: "repository_1",
    commitSha: "commit-context",
    contextVersion: "context-engine@5.7.1",
    generatedAt,
    createdAt: new Date("2026-09-22T12:00:01.000Z"),
    context: ProjectContext.fromSnapshot({
      contextId: "ctxaro_context_1",
      analysisId: "analysis_1",
      scanId: "scan_1",
      repositoryId: "repository_1",
      commitSha: "commit-context",
      contextVersion: "context-engine@5.7.1",
      generatedAt,
      project: { claims: [] },
      technology: { claims: [] },
      structure: { claims: [] },
      architecture: { claims: [] },
      entryPoints: { claims: [] },
      testing: { claims: [] },
      infrastructure: { claims: [] },
      ambiguities: []
    })
  };
}
