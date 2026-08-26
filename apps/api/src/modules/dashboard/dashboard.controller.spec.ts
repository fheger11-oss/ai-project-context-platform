import "reflect-metadata";

import { RequestMethod } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.js";
import type { DashboardProjectsQueryService } from "./dashboard-projects-query.service.js";
import { DashboardController } from "./dashboard.controller.js";

const METHOD_METADATA = "method";
const PATH_METADATA = "path";
const VERSION_METADATA = "__version__";
const GUARDS_METADATA = "__guards__";
const API_SECURITY_METADATA = "swagger/apiSecurity";

const user = {
  email: "owner@example.com",
  id: "user_1",
  role: "USER",
  tenantId: null
} as AuthenticatedUser;

function createController() {
  const dashboardProjectsQueryService = {
    listProjects: vi.fn().mockResolvedValue({ projects: [] })
  } as unknown as DashboardProjectsQueryService;

  return {
    controller: new DashboardController(dashboardProjectsQueryService),
    dashboardProjectsQueryService
  };
}

describe("DashboardController", () => {
  it("exposes GET /dashboard/projects", () => {
    expect(Reflect.getMetadata(PATH_METADATA, DashboardController)).toBe("dashboard");
    expect(Reflect.getMetadata(VERSION_METADATA, DashboardController)).toBe("1");
    expect(Reflect.getMetadata(PATH_METADATA, DashboardController.prototype.listProjects)).toBe(
      "projects"
    );
    expect(Reflect.getMetadata(METHOD_METADATA, DashboardController.prototype.listProjects)).toBe(
      RequestMethod.GET
    );
  });

  it("uses the existing Auth guard mechanism and Swagger bearer auth", () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, DashboardController) as unknown[];
    const security = Reflect.getMetadata(API_SECURITY_METADATA, DashboardController) as Array<
      Record<string, string[]>
    >;

    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
    expect(security).toContainEqual({ bearer: [] });
  });

  it("queries projects for the authenticated user only", async () => {
    const { controller, dashboardProjectsQueryService } = createController();

    await controller.listProjects(user);

    expect(dashboardProjectsQueryService.listProjects).toHaveBeenCalledWith("user_1");
  });
});
