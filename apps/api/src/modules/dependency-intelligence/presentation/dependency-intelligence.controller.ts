import { Controller, Get, Inject, Param, Query } from "@nestjs/common";
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type {
  DependencyIntelligenceHistoryResponse,
  DependencyIntelligenceResponse
} from "@ai-context/contracts";

import { Auth } from "../../auth/decorators/auth.decorator.js";
import { CurrentUser } from "../../auth/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../../auth/types/authenticated-user.js";
// ValidationPipe needs this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { RepositoryParamsDto } from "../../repositories/dto/repository-params.dto.js";
import { GetDependencyIntelligenceReadService } from "../application/get-dependency-intelligence-read.service.js";
// ValidationPipe needs this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { DependencyIntelligenceQueryDto } from "./dto/dependency-intelligence-query.dto.js";
import {
  DependencyIntelligenceHistoryResponseDto,
  DependencyIntelligenceResponseDto
} from "./dto/dependency-intelligence-response.dto.js";

@ApiTags("dependency-intelligence")
@Auth()
@Controller({ path: "repositories/:id/dependency-intelligence", version: "1" })
export class DependencyIntelligenceController {
  constructor(
    @Inject(GetDependencyIntelligenceReadService)
    private readonly reads: GetDependencyIntelligenceReadService
  ) {}

  @Get()
  @ApiOkResponse({ type: DependencyIntelligenceResponseDto })
  @ApiNotFoundResponse({ description: "Repository was not found" })
  getCurrent(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: RepositoryParamsDto,
    @Query() query: DependencyIntelligenceQueryDto
  ): Promise<DependencyIntelligenceResponse> {
    return this.reads.getCurrent(input(user.id, params.id, query));
  }

  @Get("history")
  @ApiOkResponse({ type: DependencyIntelligenceHistoryResponseDto })
  @ApiNotFoundResponse({ description: "Repository was not found" })
  getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: RepositoryParamsDto,
    @Query() query: DependencyIntelligenceQueryDto
  ): Promise<DependencyIntelligenceHistoryResponse> {
    return this.reads.getHistory(input(user.id, params.id, query));
  }
}

function input(userId: string, repositoryId: string, query: DependencyIntelligenceQueryDto) {
  return {
    userId,
    repositoryId,
    page: query.page,
    pageSize: query.pageSize,
    findingPage: query.findingPage,
    findingPageSize: query.findingPageSize
  };
}
