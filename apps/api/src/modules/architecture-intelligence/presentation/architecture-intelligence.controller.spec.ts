import { RequestMethod } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { GetCurrentArchitectureIntelligenceService } from "../application/get-current-architecture-intelligence.service.js";
import type { ListArchitectureIntelligenceHistoryService } from "../application/list-architecture-intelligence-history.service.js";
import { ArchitectureIntelligenceController } from "./architecture-intelligence.controller.js";

describe("ArchitectureIntelligenceController", () => {
  it("exposes exactly two authenticated GET routes", () => {
    expect(Reflect.getMetadata("path", ArchitectureIntelligenceController)).toBe(
      "repositories/:id/architecture-intelligence"
    );
    expect(
      Reflect.getMetadata("method", ArchitectureIntelligenceController.prototype.getCurrent)
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata("path", ArchitectureIntelligenceController.prototype.getHistory)
    ).toBe("history");
    expect(Reflect.getMetadata("__guards__", ArchitectureIntelligenceController)).toHaveLength(2);
  });

  it("passes authenticated repository scope to application services", async () => {
    const current = vi.fn(async () => ({ processing: null, intelligence: null }));
    const history = vi.fn(async () => ({
      items: [],
      pagination: { page: 1, pageSize: 20, total: 0, hasNextPage: false }
    }));
    const controller = new ArchitectureIntelligenceController(
      { execute: current } as unknown as GetCurrentArchitectureIntelligenceService,
      { execute: history } as unknown as ListArchitectureIntelligenceHistoryService
    );
    const user = { id: "user-1", email: "a@example.com", role: "USER" as const, tenantId: null };
    await controller.getCurrent(
      user,
      { id: "repository01" },
      { page: 1, pageSize: 20, modulePage: 1, modulePageSize: 20 }
    );
    await controller.getHistory(user, { id: "repository01" }, { page: 1, pageSize: 20 });
    expect(current).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", repositoryId: "repository01" })
    );
    expect(history).toHaveBeenCalledWith({
      userId: "user-1",
      repositoryId: "repository01",
      page: 1,
      pageSize: 20
    });
  });
});
