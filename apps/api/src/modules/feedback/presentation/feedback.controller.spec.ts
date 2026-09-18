import "reflect-metadata";

import { RequestMethod } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../../auth/guards/roles.guard.js";
import type { AuthenticatedUser } from "../../auth/types/authenticated-user.js";
import type { CreateFeedbackService } from "../application/create-feedback.service.js";
import { FeedbackController } from "./feedback.controller.js";

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
  const createFeedbackService = {
    execute: vi.fn(async (input) => ({
      id: "feedback_1",
      createdAt: new Date("2026-09-18T12:00:00.000Z"),
      ...input
    }))
  } as unknown as CreateFeedbackService;

  return {
    controller: new FeedbackController(createFeedbackService),
    createFeedbackService
  };
}

describe("FeedbackController", () => {
  it("exposes POST /feedback", () => {
    expect(Reflect.getMetadata(PATH_METADATA, FeedbackController)).toBe("feedback");
    expect(Reflect.getMetadata(VERSION_METADATA, FeedbackController)).toBe("1");
    expect(Reflect.getMetadata(PATH_METADATA, FeedbackController.prototype.create)).toBe("/");
    expect(Reflect.getMetadata(METHOD_METADATA, FeedbackController.prototype.create)).toBe(
      RequestMethod.POST
    );
  });

  it("uses the existing Auth guard mechanism and Swagger bearer auth", () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, FeedbackController) as unknown[];
    const security = Reflect.getMetadata(API_SECURITY_METADATA, FeedbackController) as Array<
      Record<string, string[]>
    >;

    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
    expect(security).toContainEqual({ bearer: [] });
  });

  it("creates feedback for the authenticated user", async () => {
    const { controller, createFeedbackService } = createController();

    await expect(
      controller.create(user, {
        type: "FEATURE_REQUEST",
        message: "Please add scan comparison views.",
        page: "/analyses/analysis_1"
      })
    ).resolves.toEqual({
      id: "feedback_1",
      type: "FEATURE_REQUEST",
      page: "/analyses/analysis_1",
      createdAt: "2026-09-18T12:00:00.000Z"
    });
    expect(createFeedbackService.execute).toHaveBeenCalledWith({
      userId: "user_1",
      type: "FEATURE_REQUEST",
      message: "Please add scan comparison views.",
      page: "/analyses/analysis_1"
    });
  });

  it("ignores a client-submitted userId and uses the authenticated session", async () => {
    const { controller, createFeedbackService } = createController();

    await controller.create(user, {
      userId: "attacker",
      type: "BUG",
      message: "The repository sync action failed.",
      page: "/repositories/repository_1"
    } as never);

    expect(createFeedbackService.execute).toHaveBeenCalledWith({
      userId: "user_1",
      type: "BUG",
      message: "The repository sync action failed.",
      page: "/repositories/repository_1"
    });
  });
});
