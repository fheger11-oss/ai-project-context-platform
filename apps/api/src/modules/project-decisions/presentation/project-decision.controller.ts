import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query
} from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { ProjectDecision, ProjectDecisionListResponse } from "@ai-context/contracts";

import { Auth } from "../../auth/decorators/auth.decorator.js";
import { CurrentUser } from "../../auth/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../../auth/types/authenticated-user.js";
import { ProjectDecisionService } from "../application/project-decision.service.js";
// ValidationPipe needs this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CreateProjectDecisionDto } from "./dto/create-project-decision.dto.js";
// ValidationPipe needs this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ProjectDecisionParamsDto } from "./dto/project-decision-params.dto.js";
// ValidationPipe needs this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ProjectDecisionQueryDto } from "./dto/project-decision-query.dto.js";
import {
  ProjectDecisionListResponseDto,
  ProjectDecisionResponseDto,
  toProjectDecisionListResponse,
  toProjectDecisionResponse
} from "./dto/project-decision-response.dto.js";
// ValidationPipe needs this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { UpdateProjectDecisionDto } from "./dto/update-project-decision.dto.js";

@ApiTags("project-decisions")
@Auth()
@Controller({ path: "repositories/:id/decisions", version: "1" })
export class ProjectDecisionController {
  constructor(
    @Inject(ProjectDecisionService)
    private readonly service: ProjectDecisionService
  ) {}

  @Get()
  @ApiOkResponse({ type: ProjectDecisionListResponseDto })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: ProjectDecisionParamsDto,
    @Query() query: ProjectDecisionQueryDto
  ): Promise<ProjectDecisionListResponse> {
    return toProjectDecisionListResponse(
      await this.service.list({
        userId: user.id,
        repositoryId: params.id,
        page: query.page,
        pageSize: query.pageSize,
        ...(query.status ? { status: query.status } : {})
      })
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: ProjectDecisionResponseDto })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: ProjectDecisionParamsDto,
    @Body() dto: CreateProjectDecisionDto
  ): Promise<ProjectDecision> {
    return toProjectDecisionResponse(await this.service.create(user.id, params.id, dto));
  }

  @Get(":decisionId")
  @ApiOkResponse({ type: ProjectDecisionResponseDto })
  async get(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: ProjectDecisionParamsDto
  ): Promise<ProjectDecision> {
    return toProjectDecisionResponse(
      await this.service.get(user.id, params.id, params.decisionId!)
    );
  }

  @Patch(":decisionId")
  @ApiOkResponse({ type: ProjectDecisionResponseDto })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: ProjectDecisionParamsDto,
    @Body() dto: UpdateProjectDecisionDto
  ): Promise<ProjectDecision> {
    return toProjectDecisionResponse(
      await this.service.update(user.id, params.id, params.decisionId!, dto)
    );
  }
}
