import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

import {
  FEEDBACK_MESSAGE_MAX_LENGTH,
  FEEDBACK_MESSAGE_MIN_LENGTH,
  FEEDBACK_PAGE_MAX_LENGTH
} from "../../domain/feedback.js";
import { feedbackTypes, type FeedbackType } from "../../domain/feedback-type.js";

export class CreateFeedbackDto {
  @ApiProperty({ enum: feedbackTypes, example: "FEATURE_REQUEST" })
  @IsEnum(feedbackTypes)
  type!: FeedbackType;

  @ApiProperty({ example: "I would like saved comparison views between scans." })
  @IsString()
  @MinLength(FEEDBACK_MESSAGE_MIN_LENGTH)
  @MaxLength(FEEDBACK_MESSAGE_MAX_LENGTH)
  message!: string;

  @ApiPropertyOptional({ example: "/analyses/analysis_1" })
  @IsOptional()
  @IsString()
  @MaxLength(FEEDBACK_PAGE_MAX_LENGTH)
  @Matches(/^\//, { message: "page must be a pathname" })
  @Matches(/^[^?#]*$/, { message: "page must not include query strings or hashes" })
  page?: string;
}
