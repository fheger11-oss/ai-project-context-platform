import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../prisma/prisma.service.js";
import type { GitHubAccountService } from "../auth/providers/github-account.service.js";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.js";
import type { GitHubRepositoryProvider } from "./providers/github-repository.provider.js";
import { RepositoriesService } from "./repositories.service.js";

const user: AuthenticatedUser = {
  email: "owner@example.com",
  id: "user_1",
  role: "USER",
  tenantId: null
};

function createService(repository: {
  delete?: ReturnType<typeof vi.fn>;
  findUnique?: ReturnType<typeof vi.fn>;
}) {
  const prisma = {
    repository: {
      delete: repository.delete ?? vi.fn(),
      findUnique: repository.findUnique ?? vi.fn()
    }
  } as unknown as PrismaService;

  return {
    prisma,
    service: new RepositoriesService(
      prisma,
      {} as GitHubAccountService,
      {} as GitHubRepositoryProvider
    )
  };
}

describe("RepositoriesService", () => {
  describe("disconnect", () => {
    it("removes an owned repository record", async () => {
      const deleteRepository = vi.fn().mockResolvedValue({});
      const findUnique = vi.fn().mockResolvedValue({
        id: "repository_1",
        userId: user.id
      });
      const { service } = createService({
        delete: deleteRepository,
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
  });
});
