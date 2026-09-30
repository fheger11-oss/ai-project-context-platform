import { RequestMethod } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { GetProjectTimelineService } from "../application/get-project-timeline.service.js";
import { ProjectTimelineController } from "./project-timeline.controller.js";

const METHOD_METADATA = "method";
const PATH_METADATA = "path";
const VERSION_METADATA = "__version__";
const GUARDS_METADATA = "__guards__";

const response = {
  items: [],
  pagination: {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  }
};
const user = { id: "user01", email: "owner@example.com", role: "USER" as const, tenantId: null };

describe("ProjectTimelineController", () => {
  it("exposes only GET /repositories/:id/timeline at API version 1", () => {
    expect(Reflect.getMetadata(PATH_METADATA, ProjectTimelineController)).toBe(
      "repositories/:id/timeline"
    );
    expect(Reflect.getMetadata(VERSION_METADATA, ProjectTimelineController)).toBe("1");
    expect(Reflect.getMetadata(PATH_METADATA, ProjectTimelineController.prototype.list)).toBe("/");
    expect(Reflect.getMetadata(METHOD_METADATA, ProjectTimelineController.prototype.list)).toBe(
      RequestMethod.GET
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, ProjectTimelineController)).toHaveLength(2);
  });

  it("passes authenticated ownership scope and pagination to the query service", async () => {
    const get = vi.fn(async () => response);
    const controller = new ProjectTimelineController({
      get
    } as unknown as GetProjectTimelineService);

    await expect(
      controller.list(user, { id: "repository01" }, { page: 2, pageSize: 30 })
    ).resolves.toEqual(response);
    expect(get).toHaveBeenCalledWith({
      userId: "user01",
      repositoryId: "repository01",
      page: 2,
      pageSize: 30
    });
  });
});
