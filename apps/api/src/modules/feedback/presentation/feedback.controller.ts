import { Body, Controller, HttpCode, HttpStatus, Inject, Post } from "@nestjs/common";
import { ApiBadRequestResponse, ApiCreatedResponse, ApiTags } from "@nestjs/swagger";

import { Auth } from "../../auth/decorators/auth.decorator.js";
import { CurrentUser } from "../../auth/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../../auth/types/authenticated-user.js";
import { CreateFeedbackService } from "../application/create-feedback.service.js";
// Swagger and ValidationPipe need this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CreateFeedbackDto } from "./dto/create-feedback.dto.js";
import {
  FeedbackResponseDto,
  toFeedbackResponse,
  type FeedbackResponse
} from "./dto/feedback-response.dto.js";

@ApiTags("feedback")
@Auth()
@Controller({
  path: "feedback",
  version: "1"
})
export class FeedbackController {
  constructor(
    @Inject(CreateFeedbackService)
    private readonly createFeedbackService: CreateFeedbackService
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: FeedbackResponseDto })
  @ApiBadRequestResponse({ description: "Invalid feedback request" })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFeedbackDto
  ): Promise<FeedbackResponse> {
    const feedback = await this.createFeedbackService.execute({
      userId: user.id,
      type: dto.type,
      message: dto.message,
      page: dto.page ?? null
    });

    return toFeedbackResponse(feedback);
  }
}
