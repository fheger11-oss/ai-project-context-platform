import { Controller, Get, Inject, Param } from "@nestjs/common";
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type {
  ArchitectureComparisonResponse,
  ArchitectureHistoryResponse
} from "@ai-context/contracts";

import { Auth } from "../../auth/decorators/auth.decorator.js";
import { CurrentUser } from "../../auth/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../../auth/types/authenticated-user.js";
// ValidationPipe needs this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { RepositoryParamsDto } from "../../repositories/dto/repository-params.dto.js";
import { GetArchitectureComparisonService } from "../application/get-architecture-comparison.service.js";
import { ListArchitectureHistoryService } from "../application/list-architecture-history.service.js";
// ValidationPipe needs this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ArchitectureHistoryParamsDto } from "./dto/architecture-history-params.dto.js";
import {
  ArchitectureComparisonResponseDto,
  ArchitectureHistoryResponseDto
} from "./dto/architecture-history-response.dto.js";

@ApiTags("architecture-history")
@Auth()
@Controller({ path: "repositories/:id/architecture-history", version: "1" })
export class ArchitectureHistoryController {
  constructor(
    @Inject(ListArchitectureHistoryService)
    private readonly listService: ListArchitectureHistoryService,
    @Inject(GetArchitectureComparisonService)
    private readonly comparisonService: GetArchitectureComparisonService
  ) {}

  @Get()
  @ApiOkResponse({ type: ArchitectureHistoryResponseDto })
  @ApiNotFoundResponse({ description: "Repository was not found" })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: RepositoryParamsDto
  ): Promise<ArchitectureHistoryResponse> {
    return this.listService.list({ userId: user.id, repositoryId: params.id });
  }

  @Get(":historyId/comparison")
  @ApiOkResponse({ type: ArchitectureComparisonResponseDto })
  @ApiNotFoundResponse({ description: "Repository or history snapshot was not found" })
  compare(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: ArchitectureHistoryParamsDto
  ): Promise<ArchitectureComparisonResponse> {
    return this.comparisonService.get({
      userId: user.id,
      repositoryId: params.id,
      historyId: params.historyId
    });
  }
}
