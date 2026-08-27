import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags
} from "@nestjs/swagger";

import { Auth } from "../../auth/decorators/auth.decorator.js";
import { CurrentUser } from "../../auth/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../../auth/types/authenticated-user.js";
import { DocumentNotFoundError } from "../application/errors/document-not-found.error.js";
import { ProjectContextNotFoundForDocumentGenerationError } from "../application/errors/project-context-not-found-for-document-generation.error.js";
import { GenerateDocumentUseCase } from "../application/generate-document.use-case.js";
import { GetDocumentUseCase } from "../application/get-document.use-case.js";
import { ListDocumentHistoryUseCase } from "../application/list-document-history.use-case.js";
import { RegenerateDocumentUseCase } from "../application/regenerate-document.use-case.js";
import { InvalidDocumentFormatError } from "../domain/errors/invalid-document-format.error.js";
import { InvalidDocumentTypeError } from "../domain/errors/invalid-document-type.error.js";
// ValidationPipe needs this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { DocumentHistoryQueryDto } from "./dto/document-history-query.dto.js";
import {
  DocumentHistoryResponseDto,
  toDocumentHistoryResponse,
  type DocumentHistoryResponse
} from "./dto/document-history-response.dto.js";
// ValidationPipe needs this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { DocumentParamsDto } from "./dto/document-params.dto.js";
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
    private readonly generateDocumentUseCase: GenerateDocumentUseCase,
    @Inject(GetDocumentUseCase)
    private readonly getDocumentUseCase: GetDocumentUseCase,
    @Inject(ListDocumentHistoryUseCase)
    private readonly listDocumentHistoryUseCase: ListDocumentHistoryUseCase,
    @Inject(RegenerateDocumentUseCase)
    private readonly regenerateDocumentUseCase: RegenerateDocumentUseCase
  ) {}

  @Get()
  @ApiQuery({ name: "contextId", type: "string" })
  @ApiOkResponse({
    description: "Generated document history for a ProjectContext.",
    type: DocumentHistoryResponseDto
  })
  @ApiNotFoundResponse({ description: "ProjectContext was not found" })
  @ApiForbiddenResponse({ description: "ProjectContext is not accessible" })
  async listByContext(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DocumentHistoryQueryDto
  ): Promise<DocumentHistoryResponse> {
    try {
      const documents = await this.listDocumentHistoryUseCase.execute({
        userId: user.id,
        contextId: query.contextId
      });

      return toDocumentHistoryResponse(documents);
    } catch (error) {
      this.handleExpectedError(error);
    }
  }

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
        format: dto.format
      });

      return toGeneratedDocumentResponse(document);
    } catch (error) {
      this.handleExpectedError(error);
    }
  }

  @Get(":documentId")
  @ApiParam({ name: "documentId", type: "string" })
  @ApiOkResponse({
    description: "Generated document artifact.",
    type: GeneratedDocumentResponseDto
  })
  @ApiNotFoundResponse({ description: "Document or ProjectContext was not found" })
  @ApiForbiddenResponse({ description: "Document is not accessible" })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: DocumentParamsDto
  ): Promise<GeneratedDocumentResponse> {
    try {
      const document = await this.getDocumentUseCase.execute({
        userId: user.id,
        documentId: params.documentId
      });

      return toGeneratedDocumentResponse(document);
    } catch (error) {
      this.handleExpectedError(error);
    }
  }

  @Post(":documentId/regenerate")
  @HttpCode(HttpStatus.CREATED)
  @ApiParam({ name: "documentId", type: "string" })
  @ApiCreatedResponse({
    description: "New regenerated document artifact.",
    type: GeneratedDocumentResponseDto
  })
  @ApiNotFoundResponse({ description: "Document or ProjectContext was not found" })
  @ApiForbiddenResponse({ description: "Document is not accessible" })
  async regenerate(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: DocumentParamsDto
  ): Promise<GeneratedDocumentResponse> {
    try {
      const document = await this.regenerateDocumentUseCase.execute({
        userId: user.id,
        documentId: params.documentId
      });

      return toGeneratedDocumentResponse(document);
    } catch (error) {
      this.handleExpectedError(error);
    }
  }

  private handleExpectedError(error: unknown): never {
    if (error instanceof DocumentNotFoundError) {
      throw new NotFoundException("Document was not found");
    }

    if (error instanceof ProjectContextNotFoundForDocumentGenerationError) {
      throw new NotFoundException("ProjectContext was not found");
    }

    if (error instanceof InvalidDocumentTypeError || error instanceof InvalidDocumentFormatError) {
      throw new BadRequestException(error.message);
    }

    throw error;
  }
}
