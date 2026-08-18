import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Post
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiTags
} from "@nestjs/swagger";

import { Auth } from "../../auth/decorators/auth.decorator.js";
import { CurrentUser } from "../../auth/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../../auth/types/authenticated-user.js";
import { ProjectContextNotFoundForDocumentGenerationError } from "../application/errors/project-context-not-found-for-document-generation.error.js";
import { GenerateDocumentUseCase } from "../application/generate-document.use-case.js";
import { InvalidDocumentFormatError } from "../domain/errors/invalid-document-format.error.js";
import { InvalidDocumentTypeError } from "../domain/errors/invalid-document-type.error.js";
// Swagger and ValidationPipe need this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { GenerateDocumentDto } from "./dto/generate-document.dto.js";
import {
  GeneratedDocumentResponseDto,
  toGeneratedDocumentResponse,
  type GeneratedDocumentResponse
} from "./dto/generated-document-response.dto.js";

@ApiTags("documents")
@Auth()
@Controller({
  path: "documents",
  version: "1"
})
export class DocumentController {
  constructor(
    @Inject(GenerateDocumentUseCase)
    private readonly generateDocumentUseCase: GenerateDocumentUseCase
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({
    description: "Generated document artifact.",
    type: GeneratedDocumentResponseDto
  })
  @ApiBadRequestResponse({
    description: "Invalid request, unsupported document type, or unsupported document format"
  })
  @ApiNotFoundResponse({ description: "ProjectContext was not found" })
  @ApiForbiddenResponse({ description: "ProjectContext is not accessible" })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateDocumentDto
  ): Promise<GeneratedDocumentResponse> {
    try {
      const document = await this.generateDocumentUseCase.execute({
        userId: user.id,
        contextId: dto.contextId,
        documentType: dto.documentType,
        format: dto.format,
        generatorVersion: dto.generatorVersion
      });

      return toGeneratedDocumentResponse(document);
    } catch (error) {
      if (error instanceof ProjectContextNotFoundForDocumentGenerationError) {
        throw new NotFoundException("ProjectContext was not found");
      }

      if (
        error instanceof InvalidDocumentTypeError ||
        error instanceof InvalidDocumentFormatError
      ) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }
}
