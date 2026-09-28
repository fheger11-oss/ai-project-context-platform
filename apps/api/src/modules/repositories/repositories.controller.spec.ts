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
  it("returns the repository automation capability without exposing provider credentials", async () => {
    const getAutomationStatus = vi.fn(async () => ({
      automaticUpdates: {
        capability: "CANNOT_MANAGE_WEBHOOK" as const,
        configuration: "NOT_CONFIGURED" as const,
        enabled: false,
        lastOutcome: null,
        lastVerifiedAt: null
      }
    }));
    const controller = createController({}, { getAutomationStatus });

    const response = await controller.getAutomationStatus(user, { id: "repository_1" });

    expect(getAutomationStatus).toHaveBeenCalledWith(user, "repository_1");
    expect(response).toEqual({
      automaticUpdates: {
        capability: "CANNOT_MANAGE_WEBHOOK",
        configuration: "NOT_CONFIGURED",
        enabled: false,
        lastOutcome: null,
        lastVerifiedAt: null
      }
    });
    expect(JSON.stringify(response)).not.toMatch(
      /accessToken|authorization|webhookSecret|provider-token/i
    );
  });

  it("delegates idempotent automation reconciliation without exposing secrets", async () => {
    const reconcileAutomation = vi.fn().mockResolvedValue({
      automaticUpdates: {
        capability: "CAN_MANAGE_WEBHOOK",
        configuration: "ENABLED",
        enabled: true,
        lastOutcome: "WEBHOOK_ALREADY_CONFIGURED",
        lastVerifiedAt: new Date("2026-09-28T14:00:00.000Z")
      }
    });
    const controller = createController({}, { reconcileAutomation });

    const response = await controller.reconcileAutomation(user, { id: "repository_1" });

    expect(reconcileAutomation).toHaveBeenCalledWith(user, "repository_1");
    expect(response.automaticUpdates.enabled).toBe(true);
    expect(JSON.stringify(response)).not.toMatch(
      /accessToken|authorization|secret|provider-token/i
    );
  });

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

  it("refreshes RepositoryState remote HEAD through the explicit action endpoint", async () => {
    const refreshRemoteHead = vi.fn(async () => ({
      id: "state_1",
      repositoryId: "repository_1",
      remoteHeadCommitSha: "remote_commit_sha",
      remoteHeadCheckedAt: new Date("2026-09-22T12:30:00.000Z"),
      lastScannedCommitSha: "commit-scan",
      lastAnalyzedCommitSha: "commit-analysis",
      currentProjectContextId: "context_1",
      currentContextCommitSha: "remote_commit_sha",
      freshnessStatus: RepositoryFreshnessStatus.FRESH,
      lastUpdateStatus: null,
      createdAt: new Date("2026-09-22T12:00:00.000Z"),
      updatedAt: new Date("2026-09-22T12:30:00.000Z")
    }));
    const controller = createController({ refreshRemoteHead });

    const response = await controller.refreshState(user, { id: "repository_1" });

    expect(refreshRemoteHead).toHaveBeenCalledWith("repository_1", "user_1");
    expect(response).toEqual({
      repositoryId: "repository_1",
      freshnessStatus: "FRESH",
      remoteHeadCommitSha: "remote_commit_sha",
      remoteHeadCheckedAt: "2026-09-22T12:30:00.000Z",
      lastScannedCommitSha: "commit-scan",
      lastAnalyzedCommitSha: "commit-analysis",
      currentProjectContextId: "context_1",
      currentContextCommitSha: "remote_commit_sha",
      lastUpdateStatus: null
    });
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
  repositoryStateService: Partial<RepositoryStateService>,
  repositoriesService: Partial<RepositoriesService> = {}
): RepositoriesController {
  return new RepositoriesController(
    repositoriesService as RepositoriesService,
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
