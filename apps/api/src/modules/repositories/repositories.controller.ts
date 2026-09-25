import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post
} from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { Auth } from "../auth/decorators/auth.decorator.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.js";
import { EXPENSIVE_OPERATION_RATE_LIMIT } from "../config/rate-limit.config.js";
import { AvailableGitHubRepositoryListResponseDto } from "./dto/available-github-repository-response.dto.js";
// Swagger and ValidationPipe need these DTOs as runtime values.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ConnectRepositoryDto } from "./dto/connect-repository.dto.js";
// ValidationPipe needs this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { RepositoryParamsDto } from "./dto/repository-params.dto.js";
import { RepositoryListResponseDto, RepositoryResponseDto } from "./dto/repository-response.dto.js";
import {
  RepositoryStateResponseDto,
  toRepositoryStateSummary,
  type RepositoryStateSummary
} from "./dto/repository-state-response.dto.js";
import { RepositoriesService } from "./repositories.service.js";
import { RepositoryStateService } from "./repository-state.service.js";
import {
  ProjectContextResponseDto,
  toProjectContextResponse,
  type ProjectContextResponse
} from "../context/presentation/dto/project-context-response.dto.js";

@ApiTags("repositories")
@Auth()
@Controller({
  path: "repositories",
  version: "1"
})
export class RepositoriesController {
  constructor(
    @Inject(RepositoriesService)
    private readonly repositoriesService: RepositoriesService,
    @Inject(RepositoryStateService)
    private readonly repositoryStateService: RepositoryStateService
  ) {}

  @Get("github/list")
  @Throttle(EXPENSIVE_OPERATION_RATE_LIMIT)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AvailableGitHubRepositoryListResponseDto })
  async listAvailableGitHubRepositories(@CurrentUser() user: AuthenticatedUser) {
    const repositories = await this.repositoriesService.listAvailableGitHubRepositories(user);

    return { repositories };
  }

  @Post("connect")
  @Throttle(EXPENSIVE_OPERATION_RATE_LIMIT)
  @ApiCreatedResponse({ type: RepositoryResponseDto })
  connect(@CurrentUser() user: AuthenticatedUser, @Body() dto: ConnectRepositoryDto) {
    return this.repositoriesService.connect(user, dto.githubId);
  }

  @Get()
  @ApiOkResponse({ type: RepositoryListResponseDto })
  async list(@CurrentUser() user: AuthenticatedUser) {
    const repositories = await this.repositoriesService.list(user);

    return { repositories };
  }

  @Get(":id/state")
  @ApiOkResponse({ type: RepositoryStateResponseDto })
  async getState(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: RepositoryParamsDto
  ): Promise<RepositoryStateSummary> {
    const state = await this.repositoryStateService.getOrInitialize(params.id, user.id);

    return toRepositoryStateSummary(state);
  }

  @Post(":id/state/refresh")
  @Throttle(EXPENSIVE_OPERATION_RATE_LIMIT)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: RepositoryStateResponseDto })
  async refreshState(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: RepositoryParamsDto
  ): Promise<RepositoryStateSummary> {
    const state = await this.repositoryStateService.refreshRemoteHead(params.id, user.id);

    return toRepositoryStateSummary(state);
  }

  @Get(":id/current-context")
  @ApiOkResponse({ type: ProjectContextResponseDto })
  async getCurrentContext(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: RepositoryParamsDto
  ): Promise<ProjectContextResponse> {
    const context = await this.repositoryStateService.getCurrentProjectContext(params.id, user.id);

    return toProjectContextResponse(context);
  }

  @Get(":id")
  @ApiOkResponse({ type: RepositoryResponseDto })
  getById(@CurrentUser() user: AuthenticatedUser, @Param() params: RepositoryParamsDto) {
    return this.repositoriesService.getById(user, params.id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  disconnect(@CurrentUser() user: AuthenticatedUser, @Param() params: RepositoryParamsDto) {
    return this.repositoriesService.disconnect(user, params.id);
  }

  @Post(":id/sync")
  @Throttle(EXPENSIVE_OPERATION_RATE_LIMIT)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: RepositoryResponseDto })
  sync(@CurrentUser() user: AuthenticatedUser, @Param() params: RepositoryParamsDto) {
    return this.repositoriesService.sync(user, params.id);
  }
}
