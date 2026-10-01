import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { RepositoriesService } from "../../repositories/repositories.service.js";
import type { ArchitectureHistoryReader } from "../domain/contracts/architecture-history-reader.contract.js";
import { historySource } from "../testing/architecture-history-fixtures.js";
import { GetArchitectureComparisonService } from "./get-architecture-comparison.service.js";
import { ListArchitectureHistoryService } from "./list-architecture-history.service.js";

function harness(options?: { sources?: ReturnType<typeof historySource>[]; denyAccess?: boolean }) {
  const sources = options?.sources ?? [
    historySource({ historyId: "history0001", promotedAt: new Date("2026-09-01T00:00:00Z") }),
    historySource({ historyId: "history0002", promotedAt: new Date("2026-09-02T00:00:00Z") }),
    historySource({ historyId: "history0003", promotedAt: new Date("2026-09-03T00:00:00Z") })
  ];
  const list = vi.fn(async () => sources);
  const ownership = vi.fn(async () => {
    if (options?.denyAccess) throw new ForbiddenException();
    return { id: "repository01" };
  });
  const reader = { list } as unknown as ArchitectureHistoryReader;
  const repositories = {
    getScanAccessMetadataForUser: ownership
  } as unknown as RepositoriesService;
  return {
    listService: new ListArchitectureHistoryService(reader, repositories),
    comparisonService: new GetArchitectureComparisonService(reader, repositories),
    list,
    ownership
  };
}

describe("Architecture History query services", () => {
  it("returns an empty durable history without synthesizing snapshots", async () => {
    await expect(
      harness({ sources: [] }).listService.list({
        userId: "user000001",
        repositoryId: "repository01"
      })
    ).resolves.toEqual({ items: [] });
  });

  it("authorizes before reading and returns newest durable snapshot first", async () => {
    const h = harness();
    const result = await h.listService.list({ userId: "user000001", repositoryId: "repository01" });
    expect(h.ownership).toHaveBeenCalledWith("user000001", "repository01");
    expect(h.ownership.mock.invocationCallOrder[0]).toBeLessThan(
      h.list.mock.invocationCallOrder[0]!
    );
    expect(result.items.map((item) => item.historyId)).toEqual([
      "history0003",
      "history0002",
      "history0001"
    ]);
    expect(result.items.map((item) => item.hasPreviousSnapshot)).toEqual([true, true, false]);
  });

  it("server-selects the immediately preceding durable snapshot", async () => {
    const result = await harness().comparisonService.get({
      userId: "user000001",
      repositoryId: "repository01",
      historyId: "history0003"
    });
    expect(result.baseline?.historyId).toBe("history0002");
    expect(result.target.historyId).toBe("history0003");
    expect(result.baseline?.hasPreviousSnapshot).toBe(true);
  });

  it("returns NO_BASELINE for the first durable snapshot", async () => {
    const result = await harness().comparisonService.get({
      userId: "user000001",
      repositoryId: "repository01",
      historyId: "history0001"
    });
    expect(result.status).toBe("NO_BASELINE");
  });

  it("rejects a history ID outside the repository-scoped reader result", async () => {
    await expect(
      harness().comparisonService.get({
        userId: "user000001",
        repositoryId: "repository01",
        historyId: "history9999"
      })
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("propagates repository access rejection without reading history", async () => {
    const h = harness({ denyAccess: true });
    await expect(
      h.listService.list({ userId: "otheruser1", repositoryId: "repository01" })
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(h.list).not.toHaveBeenCalled();
  });
});
