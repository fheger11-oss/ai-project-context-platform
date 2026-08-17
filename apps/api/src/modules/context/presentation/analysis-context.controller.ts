import { Controller, Get, HttpCode, HttpStatus, Inject, Param, Post } from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags
} from "@nestjs/swagger";

import { Auth } from "../../auth/decorators/auth.decorator.js";
import { CurrentUser } from "../../auth/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../../auth/types/authenticated-user.js";
import { GenerateAndPersistProjectContextService } from "../application/generate-and-persist-project-context.service.js";
import { GetAnalysisProjectContextsService } from "../application/get-analysis-project-contexts.service.js";
// ValidationPipe needs this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AnalysisContextParamsDto } from "./dto/context-params.dto.js";
import {
  ProjectContextHistoryResponseDto,
  ProjectContextResponseDto,
  toProjectContextHistoryResponse,
  toProjectContextResponse,
  type ProjectContextHistoryResponse,
  type ProjectContextResponse
} from "./dto/project-context-response.dto.js";

@ApiTags("contexts")
@Auth()
@Controller({
  path: "analyses/:analysisId/contexts",
  version: "1"
})
export class AnalysisContextController {
  constructor(
    @Inject(GetAnalysisProjectContextsService)
    private readonly getAnalysisProjectContextsService: GetAnalysisProjectContextsService,
    @Inject(GenerateAndPersistProjectContextService)
    private readonly generateAndPersistProjectContextService: GenerateAndPersistProjectContextService
  ) {}

  @Get("latest")
  @ApiParam({ name: "analysisId", type: "string" })
  @ApiOkResponse({
    description: "Latest persisted Context for an Analysis.",
    type: ProjectContextResponseDto
  })
  @ApiNotFoundResponse({ description: "Analysis or Context was not found" })
  @ApiForbiddenResponse({ description: "Analysis is not accessible" })
  async getLatest(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: AnalysisContextParamsDto
  ): Promise<ProjectContextResponse> {
    const context = await this.getAnalysisProjectContextsService.getLatest({
      userId: user.id,
      analysisId: params.analysisId
    });

    return toProjectContextResponse(context);
  }

  @Get()
  @ApiParam({ name: "analysisId", type: "string" })
  @ApiOkResponse({
    description: "Immutable Context generation history for an Analysis.",
    type: ProjectContextHistoryResponseDto
  })
  @ApiNotFoundResponse({ description: "Analysis was not found" })
  @ApiForbiddenResponse({ description: "Analysis is not accessible" })
  async getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: AnalysisContextParamsDto
  ): Promise<ProjectContextHistoryResponse> {
    const history = await this.getAnalysisProjectContextsService.getHistory({
      userId: user.id,
      analysisId: params.analysisId
    });

    return toProjectContextHistoryResponse(history);
  }

  @Post("generate")
  @HttpCode(HttpStatus.CREATED)
  @ApiParam({ name: "analysisId", type: "string" })
  @ApiCreatedResponse({
    description: "Context generated and persisted as a new immutable record.",
    type: ProjectContextResponseDto
  })
  @ApiNotFoundResponse({ description: "Analysis was not found" })
  @ApiForbiddenResponse({ description: "Analysis is not accessible" })
  async generate(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: AnalysisContextParamsDto
  ): Promise<ProjectContextResponse> {
    const context = await this.generateAndPersistProjectContextService.generate({
      userId: user.id,
      analysisId: params.analysisId
    });

    return toProjectContextResponse(context);
  }
}
