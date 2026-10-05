import { ForbiddenException, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../prisma/prisma.service.js";
import type { OperationLockService } from "../usage/operation-lock.service.js";
import type { UsageService } from "../usage/usage.service.js";
import type { GitHubAccountService } from "../auth/providers/github-account.service.js";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.js";
import type { GitHubRepositoryProvider } from "./providers/github-repository.provider.js";
import { RepositoriesService } from "./repositories.service.js";
import type { RepositoryWebhookProvisioningService } from "./application/repository-webhook-provisioning.service.js";

const user: AuthenticatedUser = {
  email: "owner@example.com",
  id: "user_1",
  role: "USER",
  tenantId: null
};

function serviceFor(
  prisma: PrismaService,
  webhookProvisioning = {
    cleanup: vi.fn().mockResolvedValue(true),
    getStatus: vi.fn(),
    reconcile: vi.fn()
  } as unknown as RepositoryWebhookProvisioningService
) {
  return new RepositoriesService(
    prisma,
    {} as GitHubAccountService,
    {} as GitHubRepositoryProvider,
    {
      assertRepositoryQuota: vi.fn(async () => undefined)
    } as unknown as UsageService,
    {
      withLocks: vi.fn(async (_locks, operation: () => Promise<unknown>) => operation())
    } as unknown as OperationLockService,
    webhookProvisioning
  );
}

function createService(repository: {
  delete?: ReturnType<typeof vi.fn>;
  deleteHistory?: ReturnType<typeof vi.fn>;
  findUnique?: ReturnType<typeof vi.fn>;
  cleanup?: ReturnType<typeof vi.fn>;
}) {
  const prisma = {
    repository: {
      delete: repository.delete ?? vi.fn(),
      findUnique: repository.findUnique ?? vi.fn()
    },
    repositoryContextHistory: {
      deleteMany: repository.deleteHistory ?? vi.fn().mockResolvedValue({ count: 0 })
    },
    $transaction: vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations))
  } as unknown as PrismaService;

  return {
    prisma,
    service: serviceFor(prisma, {
      cleanup: repository.cleanup ?? vi.fn().mockResolvedValue(true)
    } as unknown as RepositoryWebhookProvisioningService)
  };
}

describe("RepositoriesService", () => {
  describe("automation capability", () => {
    it("returns the provider capability for an owned connected repository", async () => {
      const getStatus = vi.fn().mockResolvedValue({
        automaticUpdates: {
          capability: "CAN_MANAGE_WEBHOOK",
          configuration: "NOT_CONFIGURED",
          enabled: false,
          lastOutcome: null,
          lastVerifiedAt: null
        }
      });
      const service = new RepositoriesService(
        {} as PrismaService,
        {} as GitHubAccountService,
        {} as GitHubRepositoryProvider,
        {} as UsageService,
        {} as OperationLockService,
        { getStatus } as unknown as RepositoryWebhookProvisioningService
      );

      await expect(service.getAutomationStatus(user, "repository_1")).resolves.toEqual({
        automaticUpdates: {
          capability: "CAN_MANAGE_WEBHOOK",
          configuration: "NOT_CONFIGURED",
          enabled: false,
          lastOutcome: null,
          lastVerifiedAt: null
        }
      });
      expect(getStatus).toHaveBeenCalledWith(user, "repository_1");
    });

    it("preserves ownership-safe not-found behavior", async () => {
      const service = new RepositoriesService(
        { repository: { findFirst: vi.fn().mockResolvedValue(null) } } as unknown as PrismaService,
        {} as GitHubAccountService,
        {} as GitHubRepositoryProvider,
        {} as UsageService,
        {} as OperationLockService,
        {
          getStatus: vi.fn().mockRejectedValue(new NotFoundException())
        } as unknown as RepositoryWebhookProvisioningService
      );

      await expect(service.getAutomationStatus(user, "repository_2")).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it("delegates explicit automatic-update disable to the provisioning lifecycle", async () => {
      const disabled = {
        automaticUpdates: {
          capability: "CAN_MANAGE_WEBHOOK",
          configuration: "NOT_CONFIGURED",
          enabled: false,
          lastOutcome: "WEBHOOK_DELETED",
          lastVerifiedAt: new Date()
        }
      } as const;
      const disable = vi.fn().mockResolvedValue(disabled);
      const service = serviceFor(
        {} as PrismaService,
        {
          disable
        } as unknown as RepositoryWebhookProvisioningService
      );

      await expect(service.disableAutomation(user, "repository_1")).resolves.toEqual(disabled);
      expect(disable).toHaveBeenCalledWith(user, "repository_1");
    });

    it("keeps a successful repository connection when capability detection is unavailable", async () => {
      const repository = {
        githubId: "123",
        name: "repository",
        fullName: "owner/repository",
        owner: "owner",
        description: null,
        defaultBranch: "main",
        visibility: "PRIVATE",
        language: "TypeScript",
        stars: 0,
        forks: 0,
        isArchived: false,
        cloneUrl: "https://github.com/owner/repository.git",
        htmlUrl: "https://github.com/owner/repository",
        githubUpdatedAt: new Date("2026-09-28T10:00:00.000Z")
      };
      const storedRepository = {
        id: "repository_1",
        userId: "user_1",
        ...repository,
        lastSyncedAt: new Date("2026-09-28T10:01:00.000Z"),
        createdAt: new Date("2026-09-28T10:01:00.000Z"),
        updatedAt: new Date("2026-09-28T10:01:00.000Z")
      };
      const getAccessTokenForUser = vi.fn().mockResolvedValue("provider-token");
      const service = new RepositoriesService(
        {
          repository: { upsert: vi.fn().mockResolvedValue(storedRepository) }
        } as unknown as PrismaService,
        { getAccessTokenForUser } as unknown as GitHubAccountService,
        {
          getRepositoryById: vi.fn().mockResolvedValue(repository),
          checkWebhookManagementCapability: vi.fn()
        } as unknown as GitHubRepositoryProvider,
        { assertRepositoryQuota: vi.fn().mockResolvedValue(undefined) } as unknown as UsageService,
        {
          withLocks: vi.fn(async (_locks, operation: () => Promise<unknown>) => operation())
        } as unknown as OperationLockService,
        {
          reconcile: vi.fn().mockResolvedValue({
            automaticUpdates: {
              capability: "PROVIDER_UNAVAILABLE",
              configuration: "UNAVAILABLE",
              enabled: false,
              lastOutcome: "WEBHOOK_PROVIDER_UNAVAILABLE",
              lastVerifiedAt: null
            }
          })
        } as unknown as RepositoryWebhookProvisioningService
      );

      await expect(service.connect(user, "123")).resolves.toMatchObject({
        id: "repository_1",
        automaticUpdates: {
          capability: "PROVIDER_UNAVAILABLE",
          configuration: "UNAVAILABLE",
          enabled: false,
          lastOutcome: "WEBHOOK_PROVIDER_UNAVAILABLE",
          lastVerifiedAt: null
        }
      });
    });
  });

  describe("getScanAccessMetadataForUser", () => {
    it("returns repository metadata required by scan infrastructure", async () => {
      const findFirst = vi.fn().mockResolvedValue({
        id: "repository_1",
        userId: "user_1",
        owner: "owner",
        name: "repository",
        defaultBranch: "main"
      });
      const prisma = {
        repository: {
          findFirst
        }
      } as unknown as PrismaService;
      const service = serviceFor(prisma);

      await expect(service.getScanAccessMetadataForUser("user_1", "repository_1")).resolves.toEqual(
        {
          id: "repository_1",
          userId: "user_1",
          owner: "owner",
          name: "repository",
          defaultBranch: "main"
        }
      );
      expect(findFirst).toHaveBeenCalledWith({
        where: {
          id: "repository_1",
          userId: "user_1"
        },
        select: {
          id: true,
          userId: true,
          owner: true,
          name: true,
          defaultBranch: true
        }
      });
    });

    it("returns 404 when scan repository metadata does not exist", async () => {
      const prisma = {
        repository: {
          findFirst: vi.fn().mockResolvedValue(null)
        }
      } as unknown as PrismaService;
      const service = serviceFor(prisma);

      await expect(
        service.getScanAccessMetadataForUser("user_1", "missing_repository")
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("returns 404 when scan repository metadata belongs to another user", async () => {
      const findFirst = vi.fn().mockResolvedValue(null);
      const prisma = {
        repository: {
          findFirst
        }
      } as unknown as PrismaService;
      const service = serviceFor(prisma);

      await expect(
        service.getScanAccessMetadataForUser("user_1", "repository_2")
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "repository_2",
            userId: "user_1"
          }
        })
      );
    });
  });

  describe("disconnect", () => {
    it("removes an owned repository record", async () => {
      const deleteRepository = vi.fn().mockResolvedValue({});
      const deleteHistory = vi.fn().mockResolvedValue({ count: 2 });
      const findUnique = vi.fn().mockResolvedValue({
        id: "repository_1",
        userId: user.id
      });
      const { service } = createService({
        delete: deleteRepository,
        deleteHistory,
        findUnique
      });

      await service.disconnect(user, "repository_1");

      expect(findUnique).toHaveBeenCalledWith({
        where: { id: "repository_1" },
        select: { id: true, userId: true }
      });
      expect(deleteRepository).toHaveBeenCalledWith({
        where: { id: "repository_1" }
      });
      expect(deleteHistory).toHaveBeenCalledWith({
        where: { repositoryId: "repository_1" }
      });
    });

    it("returns 404 when the repository record does not exist", async () => {
      const deleteRepository = vi.fn();
      const { service } = createService({
        delete: deleteRepository,
        findUnique: vi.fn().mockResolvedValue(null)
      });

      await expect(service.disconnect(user, "missing_repository")).rejects.toBeInstanceOf(
        NotFoundException
      );
      expect(deleteRepository).not.toHaveBeenCalled();
    });

    it("returns 403 when the repository belongs to another user", async () => {
      const deleteRepository = vi.fn();
      const { service } = createService({
        delete: deleteRepository,
        findUnique: vi.fn().mockResolvedValue({
          id: "repository_2",
          userId: "user_2"
        })
      });

      await expect(service.disconnect(user, "repository_2")).rejects.toBeInstanceOf(
        ForbiddenException
      );
      expect(deleteRepository).not.toHaveBeenCalled();
    });

    it("keeps the repository connected when remote webhook cleanup is pending", async () => {
      const deleteRepository = vi.fn();
      const cleanup = vi.fn().mockResolvedValue(false);
      const { service } = createService({
        cleanup,
        delete: deleteRepository,
        findUnique: vi.fn().mockResolvedValue({ id: "repository_1", userId: user.id })
      });

      await expect(service.disconnect(user, "repository_1")).rejects.toBeInstanceOf(
        ServiceUnavailableException
      );
      expect(cleanup).toHaveBeenCalledWith(user, "repository_1");
      expect(deleteRepository).not.toHaveBeenCalled();
    });
  });
});
