import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Inject,
  NotFoundException,
  Param,
  Query,
  Res
} from "@nestjs/common";
import type { Response } from "express";
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiTags
} from "@nestjs/swagger";

import { Auth } from "../../auth/decorators/auth.decorator.js";
import { CurrentUser } from "../../auth/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../../auth/types/authenticated-user.js";
import { ProjectContextNotFoundForAiExportError } from "../application/errors/project-context-not-found-for-ai-export.error.js";
import { GenerateAiExportUseCase } from "../application/generate-ai-export.use-case.js";
import { InvalidAiExportFormatError } from "../domain/errors/invalid-ai-export-format.error.js";
// ValidationPipe needs this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ContextParamsDto } from "../../context/presentation/dto/context-params.dto.js";
// Swagger and ValidationPipe need this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AiExportQueryDto } from "./dto/ai-export-query.dto.js";
import {
  AiExportResponseDto,
  toAiExportResponse,
  type AiExportResponse
} from "./dto/ai-export-response.dto.js";

@ApiTags("ai-export")
@Auth()
@Controller({
  path: "contexts",
  version: "1"
})
export class AiExportController {
  constructor(
    @Inject(GenerateAiExportUseCase)
    private readonly generateAiExportUseCase: GenerateAiExportUseCase
  ) {}

  @Get(":contextId/export")
  @Header("Cache-Control", "private, no-store")
  @ApiParam({ name: "contextId", type: "string" })
  @ApiQuery({ name: "format", enum: ["AI_CONTEXT", "MARKDOWN", "TEXT"], required: true })
  @ApiQuery({ name: "download", enum: ["true", "false"], required: false })
  @ApiProduces("application/json", "text/markdown", "text/plain")
  @ApiOkResponse({
    description:
      "Generated AI export. Returns a JSON API response unless download=true is supplied.",
    type: AiExportResponseDto
  })
  @ApiBadRequestResponse({ description: "Invalid request or unsupported AI export format" })
  @ApiNotFoundResponse({ description: "ProjectContext was not found" })
  @ApiForbiddenResponse({ description: "ProjectContext is not accessible" })
  async exportContext(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: ContextParamsDto,
    @Query() query: AiExportQueryDto,
    @Res({ passthrough: true }) response: Response
  ): Promise<AiExportResponse | string> {
    try {
      const exported = await this.generateAiExportUseCase.execute({
        userId: user.id,
        contextId: params.contextId,
        format: query.format
      });

      if (query.download) {
        response.setHeader("Content-Type", exported.result.contentType);
        response.setHeader(
          "Content-Disposition",
          `attachment; filename="${safeAttachmentFilename(exported.result.filename)}"`
        );

        return exported.result.content;
      }

      return toAiExportResponse(exported);
    } catch (error) {
      this.handleExpectedError(error);
    }
  }

  private handleExpectedError(error: unknown): never {
    if (error instanceof ProjectContextNotFoundForAiExportError) {
      throw new NotFoundException("ProjectContext was not found");
    }

    if (error instanceof InvalidAiExportFormatError) {
      throw new BadRequestException(error.message);
    }

    throw error;
  }
}

function safeAttachmentFilename(filename: string): string {
  return filename.replaceAll(/["\\\r\n]/g, "_");
}
