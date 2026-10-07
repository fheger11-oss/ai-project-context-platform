import { RequestMethod } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { GetDependencyIntelligenceReadService } from "../application/get-dependency-intelligence-read.service.js";
import { DependencyIntelligenceController } from "./dependency-intelligence.controller.js";

describe("DependencyIntelligenceController", () => {
  it("exposes exactly two authenticated read routes", () => {
    expect(Reflect.getMetadata("path", DependencyIntelligenceController)).toBe(
      "repositories/:id/dependency-intelligence"
    );
    expect(Reflect.getMetadata("__guards__", DependencyIntelligenceController)).toHaveLength(2);
    expect(
      Reflect.getMetadata("method", DependencyIntelligenceController.prototype.getCurrent)
    ).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata("path", DependencyIntelligenceController.prototype.getHistory)).toBe(
      "history"
    );
  });

  it("passes authenticated repository scope and pagination to the read service", async () => {
    const getCurrent = vi.fn().mockResolvedValue({});
    const getHistory = vi.fn().mockResolvedValue({});
    const controller = new DependencyIntelligenceController({
      getCurrent,
      getHistory
    } as unknown as GetDependencyIntelligenceReadService);
    const user = { id: "user-a", email: "a@example.com", role: "USER" as const, tenantId: null };
    const query = { page: 2, pageSize: 10, findingPage: 3, findingPageSize: 5 };
    await controller.getCurrent(user, { id: "repository-a" }, query);
    await controller.getHistory(user, { id: "repository-a" }, query);
    const expected = { userId: "user-a", repositoryId: "repository-a", ...query };
    expect(getCurrent).toHaveBeenCalledWith(expected);
    expect(getHistory).toHaveBeenCalledWith(expected);
  });
});
