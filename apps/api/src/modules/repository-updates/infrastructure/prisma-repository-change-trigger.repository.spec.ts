import { describe, expect, it, vi } from "vitest";

import { PrismaRepositoryChangeTriggerRepository } from "./prisma-repository-change-trigger.repository.js";

describe("PrismaRepositoryChangeTriggerRepository", () => {
  it("resolves trigger ownership and provider identity from the connected repository", async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: "repository_1",
      userId: "user_1",
      githubId: "12345",
      fullName: "ctxaro/api",
      defaultBranch: "main"
    });
    const repository = new PrismaRepositoryChangeTriggerRepository({
      repository: { findUnique }
    } as never);

    await expect(repository.findConnectedById("repository_1")).resolves.toEqual({
      id: "repository_1",
      userId: "user_1",
      providerRepositoryId: "12345",
      fullName: "ctxaro/api",
      defaultBranch: "main"
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "repository_1" },
      select: {
        id: true,
        userId: true,
        githubId: true,
        fullName: true,
        defaultBranch: true
      }
    });
  });

  it("treats a deleted/disconnected repository as unknown", async () => {
    const repository = new PrismaRepositoryChangeTriggerRepository({
      repository: { findUnique: vi.fn().mockResolvedValue(null) }
    } as never);

    await expect(repository.findConnectedById("repository_1")).resolves.toBeNull();
  });
});
