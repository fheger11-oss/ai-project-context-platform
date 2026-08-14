import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Post } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags
} from "@nestjs/swagger";

import { Auth } from "../../auth/decorators/auth.decorator.js";
import { CurrentUser } from "../../auth/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../../auth/types/authenticated-user.js";
import { GetAnalysisResultService } from "../application/get-analysis-result.service.js";
import { RunAnalysisService } from "../application/run-analysis.service.js";
// ValidationPipe needs this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AnalysisParamsDto } from "./dto/analysis-params.dto.js";
// Swagger and ValidationPipe need this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CreateAnalysisDto } from "./dto/create-analysis.dto.js";
import {
  AnalysisResultResponseDto,
  toAnalysisResultResponse,
  type AnalysisResultResponse
} from "./dto/analysis-result-response.dto.js";

@ApiTags("analyses")
@Auth()
@Controller({
  path: "analyses",
  version: "1"
})
export class AnalysisController {
  constructor(
    @Inject(RunAnalysisService)
    private readonly runAnalysisService: RunAnalysisService,
    @Inject(GetAnalysisResultService)
    private readonly getAnalysisResultService: GetAnalysisResultService
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({
    description: "Analysis completed and persisted.",
    type: AnalysisResultResponseDto
  })
  @ApiBadRequestResponse({ description: "Invalid request or scan is not ready for analysis" })
  @ApiNotFoundResponse({ description: "Scan was not found" })
  @ApiForbiddenResponse({ description: "Scan is not accessible" })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAnalysisDto
  ): Promise<AnalysisResultResponse> {
    const result = await this.runAnalysisService.run({
      userId: user.id,
      scanId: dto.scanId
    });

    return toAnalysisResultResponse(result);
  }

  @Get(":analysisId")
  @ApiOkResponse({
    description: "Persisted analysis result.",
    type: AnalysisResultResponseDto
  })
  @ApiNotFoundResponse({ description: "Analysis was not found" })
  @ApiForbiddenResponse({ description: "Analysis is not accessible" })
  getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: AnalysisParamsDto
  ): Promise<AnalysisResultResponse> {
    return this.getAnalysisResultService
      .get({
        userId: user.id,
        analysisId: params.analysisId
      })
      .then((result) => toAnalysisResultResponse(result));
  }
}
