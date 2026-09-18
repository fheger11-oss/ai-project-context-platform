import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { CreateFeedbackService } from "./application/create-feedback.service.js";
import { FEEDBACK_REPOSITORY } from "./domain/contracts/feedback-repository.contract.js";
import { PrismaFeedbackRepository } from "./infrastructure/prisma-feedback.repository.js";
import { FeedbackController } from "./presentation/feedback.controller.js";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [FeedbackController],
  providers: [
    CreateFeedbackService,
    {
      provide: FEEDBACK_REPOSITORY,
      useClass: PrismaFeedbackRepository
    }
  ],
  exports: [CreateFeedbackService, FEEDBACK_REPOSITORY]
})
export class FeedbackModule {}
