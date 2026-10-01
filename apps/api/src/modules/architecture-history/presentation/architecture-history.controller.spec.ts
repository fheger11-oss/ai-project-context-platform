import { RequestMethod } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { GetArchitectureComparisonService } from "../application/get-architecture-comparison.service.js";
import type { ListArchitectureHistoryService } from "../application/list-architecture-history.service.js";
import { ArchitectureHistoryController } from "./architecture-history.controller.js";

describe("ArchitectureHistoryController", () => {
  it("exposes only the two read-only versioned routes", () => {
    expect(Reflect.getMetadata("path", ArchitectureHistoryController)).toBe(
      "repositories/:id/architecture-history"
    );
    expect(Reflect.getMetadata("__version__", ArchitectureHistoryController)).toBe("1");
    expect(Reflect.getMetadata("method", ArchitectureHistoryController.prototype.list)).toBe(
      RequestMethod.GET
    );
    expect(Reflect.getMetadata("path", ArchitectureHistoryController.prototype.compare)).toBe(
      ":historyId/comparison"
    );
    expect(Reflect.getMetadata("method", ArchitectureHistoryController.prototype.compare)).toBe(
      RequestMethod.GET
    );
    expect(Reflect.getMetadata("__guards__", ArchitectureHistoryController)).toHaveLength(2);
  });

  it("passes authenticated repository scope to both query services", async () => {
    const list = vi.fn(async () => ({ items: [] }));
    const get = vi.fn(async () => ({
      status: "NO_BASELINE" as const,
      baseline: null,
      target: {} as never
    }));
    const controller = new ArchitectureHistoryController(
      { list } as unknown as ListArchitectureHistoryService,
      { get } as unknown as GetArchitectureComparisonService
    );
    const user = {
      id: "user000001",
      email: "a@example.com",
      role: "USER" as const,
      tenantId: null
    };

    await controller.list(user, { id: "repository01" });
    await controller.compare(user, { id: "repository01", historyId: "history0001" });
    expect(list).toHaveBeenCalledWith({ userId: "user000001", repositoryId: "repository01" });
    expect(get).toHaveBeenCalledWith({
      userId: "user000001",
      repositoryId: "repository01",
      historyId: "history0001"
    });
  });
});
