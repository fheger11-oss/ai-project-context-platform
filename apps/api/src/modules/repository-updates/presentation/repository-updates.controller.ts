import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query
} from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { Auth } from "../../auth/decorators/auth.decorator.js";
import { CurrentUser } from "../../auth/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../../auth/types/authenticated-user.js";
import { EXPENSIVE_OPERATION_RATE_LIMIT } from "../../config/rate-limit.config.js";
// ValidationPipe needs this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { RepositoryParamsDto } from "../../repositories/dto/repository-params.dto.js";
import { RepositoryUpdateService } from "../application/repository-update.service.js";
import { RunRepositoryUpdateService } from "../application/run-repository-update.service.js";
// Swagger and ValidationPipe need this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { RepositoryUpdateHistoryQueryDto } from "./dto/repository-update-history-query.dto.js";
import {
  RepositoryCurrentUpdateResponseDto,
  RepositoryUpdateHistoryResponseDto,
  RepositoryUpdateResponseDto,
  RepositoryUpdateSummaryDto,
  toRepositoryUpdateHistoryResponse,
  toRepositoryUpdateResponse,
  toRepositoryUpdateSummary,
  type RepositoryCurrentUpdateResponse,
  type RepositoryUpdateDetail,
  type RepositoryUpdateHistoryResponse,
  type RepositoryUpdateResponse
} from "./dto/repository-update-response.dto.js";
// ValidationPipe needs this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { RunRepositoryUpdateRequestDto } from "./dto/run-repository-update-request.dto.js";

@ApiTags("repositories")
@Auth()
@Controller({
  path: "repositories/:id/updates",
  version: "1"
})
export class RepositoryUpdatesController {
  constructor(
    @Inject(RunRepositoryUpdateService)
    private readonly runRepositoryUpdateService: RunRepositoryUpdateService,
    @Inject(RepositoryUpdateService)
    private readonly repositoryUpdateService: RepositoryUpdateService
  ) {}

  @Get()
  @ApiOkResponse({ type: RepositoryUpdateHistoryResponseDto })
  async listUpdates(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: RepositoryParamsDto,
    @Query() query: RepositoryUpdateHistoryQueryDto
  ): Promise<RepositoryUpdateHistoryResponse> {
    const result = await this.repositoryUpdateService.listByRepository({
      repositoryId: params.id,
      userId: user.id,
      page: query.page,
      pageSize: query.pageSize
    });

    return toRepositoryUpdateHistoryResponse(result);
  }

  @Get("current")
  @ApiOkResponse({ type: RepositoryCurrentUpdateResponseDto })
  async getCurrentUpdate(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: RepositoryParamsDto
  ): Promise<RepositoryCurrentUpdateResponse> {
    const update = await this.repositoryUpdateService.getCurrentByRepository(params.id, user.id);

    return { update: update ? toRepositoryUpdateSummary(update) : null };
  }

  @Get(":updateId")
  @ApiOkResponse({ type: RepositoryUpdateSummaryDto })
  async getUpdate(
    @CurrentUser() user: AuthenticatedUser,
    @Param("updateId") updateId: string,
    @Param() params: RepositoryParamsDto
  ): Promise<RepositoryUpdateDetail> {
    const update = await this.repositoryUpdateService.getById(params.id, updateId, user.id);

    return toRepositoryUpdateSummary(update);
  }

  @Post()
  @Throttle(EXPENSIVE_OPERATION_RATE_LIMIT)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: RepositoryUpdateResponseDto })
  async runManualUpdate(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: RepositoryParamsDto,
    @Body() _request: RunRepositoryUpdateRequestDto
  ): Promise<RepositoryUpdateResponse> {
    const result = await this.runRepositoryUpdateService.runManualUpdate(params.id, user.id);

    return toRepositoryUpdateResponse(result);
  }
}
