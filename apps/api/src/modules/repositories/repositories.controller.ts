import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Post } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { Auth } from "../auth/decorators/auth.decorator.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.js";
import { AvailableGitHubRepositoryListResponseDto } from "./dto/available-github-repository-response.dto.js";
// Swagger and ValidationPipe need these DTOs as runtime values.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ConnectRepositoryDto } from "./dto/connect-repository.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { GitHubAccessTokenDto } from "./dto/github-access-token.dto.js";
import { RepositoryListResponseDto, RepositoryResponseDto } from "./dto/repository-response.dto.js";
import { RepositoriesService } from "./repositories.service.js";

@ApiTags("repositories")
@Auth()
@Controller({
  path: "repositories",
  version: "1"
})
export class RepositoriesController {
  constructor(
    @Inject(RepositoriesService)
    private readonly repositoriesService: RepositoriesService
  ) {}

  @Post("github/list")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AvailableGitHubRepositoryListResponseDto })
  async listAvailableGitHubRepositories(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GitHubAccessTokenDto
  ) {
    const repositories = await this.repositoriesService.listAvailableGitHubRepositories(
      user,
      dto.accessToken
    );

    return { repositories };
  }

  @Post("connect")
  @ApiCreatedResponse({ type: RepositoryResponseDto })
  connect(@CurrentUser() user: AuthenticatedUser, @Body() dto: ConnectRepositoryDto) {
    return this.repositoriesService.connect(user, dto.accessToken, dto.githubId);
  }

  @Get()
  @ApiOkResponse({ type: RepositoryListResponseDto })
  async list(@CurrentUser() user: AuthenticatedUser) {
    const repositories = await this.repositoriesService.list(user);

    return { repositories };
  }

  @Get(":id")
  @ApiOkResponse({ type: RepositoryResponseDto })
  getById(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.repositoriesService.getById(user, id);
  }

  @Post(":id/sync")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: RepositoryResponseDto })
  sync(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: GitHubAccessTokenDto
  ) {
    return this.repositoriesService.sync(user, id, dto.accessToken);
  }
}
