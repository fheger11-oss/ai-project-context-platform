import { Controller, Get, Inject, Param, Query } from "@nestjs/common";
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type {
  ArchitectureIntelligenceHistoryResponse,
  ArchitectureIntelligenceResponse
} from "@ai-context/contracts";

import { Auth } from "../../auth/decorators/auth.decorator.js";
import { CurrentUser } from "../../auth/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../../auth/types/authenticated-user.js";
// ValidationPipe needs this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { RepositoryParamsDto } from "../../repositories/dto/repository-params.dto.js";
import { GetCurrentArchitectureIntelligenceService } from "../application/get-current-architecture-intelligence.service.js";
import { ListArchitectureIntelligenceHistoryService } from "../application/list-architecture-intelligence-history.service.js";
// ValidationPipe needs these DTOs as runtime values.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import {
  ArchitectureIntelligenceHistoryQueryDto,
  ArchitectureIntelligenceQueryDto
} from "./dto/architecture-intelligence-query.dto.js";
import {
  ArchitectureIntelligenceHistoryResponseDto,
  ArchitectureIntelligenceResponseDto
} from "./dto/architecture-intelligence-response.dto.js";

@ApiTags("architecture-intelligence")
@Auth()
@Controller({ path: "repositories/:id/architecture-intelligence", version: "1" })
export class ArchitectureIntelligenceController {
  constructor(
    @Inject(GetCurrentArchitectureIntelligenceService)
    private readonly current: GetCurrentArchitectureIntelligenceService,
    @Inject(ListArchitectureIntelligenceHistoryService)
    private readonly history: ListArchitectureIntelligenceHistoryService
  ) {}

  @Get()
  @ApiOkResponse({ type: ArchitectureIntelligenceResponseDto })
  @ApiNotFoundResponse({ description: "Repository was not found" })
  getCurrent(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: RepositoryParamsDto,
    @Query() query: ArchitectureIntelligenceQueryDto
  ): Promise<ArchitectureIntelligenceResponse> {
    return this.current.execute({
      userId: user.id,
      repositoryId: params.id,
      page: query.page,
      pageSize: query.pageSize,
      modulePage: query.modulePage,
      modulePageSize: query.modulePageSize,
      ...(query.ruleId ? { ruleId: query.ruleId } : {}),
      ...(query.confidence ? { confidence: query.confidence } : {}),
      ...(query.lifecycle ? { lifecycle: query.lifecycle } : {})
    });
  }

  @Get("history")
  @ApiOkResponse({ type: ArchitectureIntelligenceHistoryResponseDto })
  @ApiNotFoundResponse({ description: "Repository was not found" })
  getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: RepositoryParamsDto,
    @Query() query: ArchitectureIntelligenceHistoryQueryDto
  ): Promise<ArchitectureIntelligenceHistoryResponse> {
    return this.history.execute({
      userId: user.id,
      repositoryId: params.id,
      page: query.page,
      pageSize: query.pageSize
    });
  }
}
