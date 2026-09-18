import { describe, expect, it } from "vitest";

import { AuthModule } from "../auth/auth.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { CreateFeedbackService } from "./application/create-feedback.service.js";
import { FEEDBACK_REPOSITORY } from "./domain/contracts/feedback-repository.contract.js";
import { PrismaFeedbackRepository } from "./infrastructure/prisma-feedback.repository.js";
import { FeedbackController } from "./presentation/feedback.controller.js";
import { FeedbackModule } from "./feedback.module.js";

const MODULE_METADATA = {
  controllers: "controllers",
  exports: "exports",
  imports: "imports",
  providers: "providers"
};

describe("FeedbackModule", () => {
  it("wires feedback through auth, application, domain contract, and Prisma infrastructure", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.imports, FeedbackModule)).toEqual([
      AuthModule,
      PrismaModule
    ]);
    expect(Reflect.getMetadata(MODULE_METADATA.controllers, FeedbackModule)).toContain(
      FeedbackController
    );
    expect(Reflect.getMetadata(MODULE_METADATA.providers, FeedbackModule)).toEqual(
      expect.arrayContaining([
        CreateFeedbackService,
        {
          provide: FEEDBACK_REPOSITORY,
          useClass: PrismaFeedbackRepository
        }
      ])
    );
    expect(Reflect.getMetadata(MODULE_METADATA.exports, FeedbackModule)).toEqual(
      expect.arrayContaining([CreateFeedbackService, FEEDBACK_REPOSITORY])
    );
  });
});
