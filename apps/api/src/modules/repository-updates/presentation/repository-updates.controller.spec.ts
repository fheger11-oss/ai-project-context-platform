import { NotFoundException, ValidationPipe } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import {
  RepositoryFreshnessStatus,
  RepositoryUpdateStatus,
  RepositoryUpdateTriggerType
} from "../../../generated/prisma/enums.js";
import type { RepositoryUpdateService } from "../application/repository-update.service.js";
import type { RunRepositoryUpdateService } from "../application/run-repository-update.service.js";
import type { RepositoryUpdateSnapshot } from "../domain/contracts/repository-update-repository.contract.js";
import { RepositoryUpdatesController } from "./repository-updates.controller.js";
import type { AuthenticatedUser } from "../../auth/types/authenticated-user.js";
import { RunRepositoryUpdateRequestDto } from "./dto/run-repository-update-request.dto.js";

const user: AuthenticatedUser = {
  id: "user_1",
  email: "owner@example.com",
  role: "USER",
  tenantId: null
};
const now = new Date("2026-09-23T12:00:00.000Z");

function createUpdate(overrides: Partial<RepositoryUpdateSnapshot> = {}): RepositoryUpdateSnapshot {
  return {
    id: "update_1",
    repositoryId: "repository_1",
    triggerType: RepositoryUpdateTriggerType.MANUAL,
    baseCommitSha: "commit_a",
    targetCommitSha: "commit_b",
    status: RepositoryUpdateStatus.COMPLETED,
    startedAt: new Date("2026-09-23T12:01:00.000Z"),
    completedAt: new Date("2026-09-23T12:02:00.000Z"),
    failedAt: null,
    failureReason: null,
    scanId: "scan_1",
    analysisId: "analysis_1",
    projectContextId: "context_1",
    changeSet: null,
    createdAt: now,
    updatedAt: new Date("2026-09-23T12:02:00.000Z"),
    ...overrides
  };
}

function createController(options: {
  runManualUpdate?: RunRepositoryUpdateService["runManualUpdate"];
  listByRepository?: RepositoryUpdateService["listByRepository"];
  getCurrentByRepository?: RepositoryUpdateService["getCurrentByRepository"];
  getById?: RepositoryUpdateService["getById"];
}) {
  return new RepositoryUpdatesController(
    {
      runManualUpdate: options.runManualUpdate ?? vi.fn()
    } as unknown as RunRepositoryUpdateService,
    {
      listByRepository: options.listByRepository ?? vi.fn(),
      getCurrentByRepository: options.getCurrentByRepository ?? vi.fn(),
      getById: options.getById ?? vi.fn()
    } as unknown as RepositoryUpdateService
  );
}

describe("RepositoryUpdatesController", () => {
  const validationPipe = new ValidationPipe({
    forbidNonWhitelisted: true,
    transform: true,
    whitelist: true
  });

  it("accepts the valid manual update request body", async () => {
    await expect(
      validationPipe.transform(
        {},
        {
          metatype: RunRepositoryUpdateRequestDto,
          type: "body"
        }
      )
    ).resolves.toBeInstanceOf(RunRepositoryUpdateRequestDto);
  });

  it("rejects repository ids in the manual update request body", async () => {
    await expect(
      validationPipe.transform(
        { id: "repository_1" },
        {
          metatype: RunRepositoryUpdateRequestDto,
          type: "body"
        }
      )
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        message: expect.arrayContaining(["property id should not exist"])
      })
    });
  });

  it("returns paginated repository update history", async () => {
    const listByRepository = vi.fn(async () => ({
      items: [createUpdate()],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 1,
        hasNextPage: false
      }
    }));
    const controller = createController({ listByRepository });

    const response = await controller.listUpdates(
      user,
      { id: "repository_1" },
      {
        page: 1,
        pageSize: 10
      }
    );

    expect(listByRepository).toHaveBeenCalledWith({
      repositoryId: "repository_1",
      userId: "user_1",
      page: 1,
      pageSize: 10
    });
    expect(response).toEqual({
      items: [
        {
          id: "update_1",
          repositoryId: "repository_1",
          triggerType: "MANUAL",
          status: "COMPLETED",
          baseCommitSha: "commit_a",
          targetCommitSha: "commit_b",
          startedAt: "2026-09-23T12:01:00.000Z",
          completedAt: "2026-09-23T12:02:00.000Z",
          failedAt: null,
          failureReason: null,
          scanId: "scan_1",
          analysisId: "analysis_1",
          projectContextId: "context_1",
          createdAt: "2026-09-23T12:00:00.000Z",
          updatedAt: "2026-09-23T12:02:00.000Z"
        }
      ],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 1,
        hasNextPage: false
      }
    });
  });

  it("returns the current active update or null", async () => {
    const getCurrentByRepository = vi.fn(async () =>
      createUpdate({ status: RepositoryUpdateStatus.RUNNING, completedAt: null })
    );
    const controller = createController({ getCurrentByRepository });

    const response = await controller.getCurrentUpdate(user, { id: "repository_1" });

    expect(getCurrentByRepository).toHaveBeenCalledWith("repository_1", "user_1");
    expect(response.update).toMatchObject({
      id: "update_1",
      status: "RUNNING"
    });
  });

  it("returns a repository-scoped update detail", async () => {
    const getById = vi.fn(async () =>
      createUpdate({
        status: RepositoryUpdateStatus.FAILED,
        failedAt: new Date("2026-09-23T12:02:00.000Z"),
        failureReason: "SCAN_FAILED",
        completedAt: null
      })
    );
    const controller = createController({ getById });

    const response = await controller.getUpdate(user, "update_1", { id: "repository_1" });

    expect(getById).toHaveBeenCalledWith("repository_1", "update_1", "user_1");
    expect(response).toMatchObject({
      id: "update_1",
      status: "FAILED",
      failureReason: "SCAN_FAILED",
      completedAt: null,
      failedAt: "2026-09-23T12:02:00.000Z"
    });
  });

  it("propagates ownership-safe not-found behavior", async () => {
    const listByRepository = vi.fn(async () => {
      throw new NotFoundException("Repository was not found");
    });
    const controller = createController({ listByRepository });

    await expect(
      controller.listUpdates(user, { id: "repository_2" }, { page: 1, pageSize: 10 })
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("keeps the manual update endpoint response shape unchanged", async () => {
    const runManualUpdate = vi.fn(async () => ({
      noop: false,
      update: createUpdate(),
      baseCommitSha: "commit_a",
      targetCommitSha: "commit_b",
      scanId: "scan_1",
      analysisId: "analysis_1",
      projectContextId: "context_1",
      freshnessStatus: RepositoryFreshnessStatus.FRESH
    }));
    const controller = createController({ runManualUpdate });

    const response = await controller.runManualUpdate(user, { id: "repository_1" }, {});

    expect(runManualUpdate).toHaveBeenCalledWith("repository_1", "user_1");
    expect(response).toMatchObject({
      noop: false,
      updateId: "update_1",
      status: "COMPLETED",
      triggerType: "MANUAL",
      freshnessStatus: "FRESH"
    });
  });
});
