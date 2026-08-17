import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { RepositoryOwnershipVerifier } from "../../scan/domain/contracts/repository-ownership-verifier.contract.js";
import type { PersistedProjectContext } from "../domain/contracts/project-context-repository.contract.js";
import { ProjectContext } from "../domain/project-context.js";
import type { PersistProjectContextService } from "./persist-project-context.service.js";
import { GetProjectContextService } from "./get-project-context.service.js";

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

function createService(
  options: { found?: PersistedProjectContext | null; forbidden?: boolean } = {}
) {
  const persistProjectContextService = {
    findById: vi.fn(async () => (Object.hasOwn(options, "found") ? options.found : persisted))
  } as unknown as PersistProjectContextService;
  const repositoryOwnershipVerifier = {
    verifyRepositoryOwnership: vi.fn(async () => {
      if (options.forbidden) {
        throw new ForbiddenException("Repository belongs to another user");
      }
    })
  } as unknown as RepositoryOwnershipVerifier;

  return {
    persistProjectContextService,
    repositoryOwnershipVerifier,
    service: new GetProjectContextService(persistProjectContextService, repositoryOwnershipVerifier)
  };
}

describe("GetProjectContextService", () => {
  it("returns a persisted Context after verifying repository ownership", async () => {
    const { service, persistProjectContextService, repositoryOwnershipVerifier } = createService();

    await expect(service.get({ userId: "user_1", contextId: "project_context_1" })).resolves.toBe(
      persisted
    );
    expect(persistProjectContextService.findById).toHaveBeenCalledWith("project_context_1");
    expect(repositoryOwnershipVerifier.verifyRepositoryOwnership).toHaveBeenCalledWith({
      userId: "user_1",
      repositoryId: "repository_1"
    });
  });

  it("rejects missing Contexts", async () => {
    const { service, repositoryOwnershipVerifier } = createService({ found: null });

    await expect(service.get({ userId: "user_1", contextId: "missing" })).rejects.toThrow(
      NotFoundException
    );
    expect(repositoryOwnershipVerifier.verifyRepositoryOwnership).not.toHaveBeenCalled();
  });

  it("rejects cross-user Context access", async () => {
    const { service } = createService({ forbidden: true });

    await expect(service.get({ userId: "user_2", contextId: "project_context_1" })).rejects.toThrow(
      ForbiddenException
    );
  });
});
