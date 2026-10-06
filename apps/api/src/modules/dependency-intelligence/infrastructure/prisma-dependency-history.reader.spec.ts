import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../prisma/prisma.service.js";
import { InvalidDependencySnapshotInputError } from "../domain/errors/invalid-dependency-snapshot-input.error.js";
import { PrismaDependencyHistoryReader } from "./prisma-dependency-history.reader.js";

describe("PrismaDependencyHistoryReader", () => {
  it("reads deterministic promoted history scoped to the requested repository", async () => {
    const findMany = vi.fn(async (_args: unknown) => [
      history("history-1", "context-1", 1),
      history("history-2", "context-2", 2),
      history("history-3", "context-3", 3)
    ]);
    const reader = new PrismaDependencyHistoryReader({
      repositoryContextHistory: { findMany }
    } as unknown as PrismaService);

    await expect(reader.listThroughCurrent("repository-a", "context-2")).resolves.toEqual([
      { historyId: "history-1", projectContextId: "context-1", promotedAt: new Date(1) },
      { historyId: "history-2", projectContextId: "context-2", promotedAt: new Date(2) }
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: { repositoryId: "repository-a" },
      select: { id: true, projectContextId: true, createdAt: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }]
    });
  });

  it("rejects a current context absent from repository-scoped promoted history", async () => {
    const reader = new PrismaDependencyHistoryReader({
      repositoryContextHistory: { findMany: vi.fn(async () => [history("h", "context-b", 1)]) }
    } as unknown as PrismaService);
    await expect(reader.listThroughCurrent("repository-a", "context-a")).rejects.toBeInstanceOf(
      InvalidDependencySnapshotInputError
    );
  });
});

function history(id: string, projectContextId: string, time: number) {
  return { id, projectContextId, createdAt: new Date(time) };
}
