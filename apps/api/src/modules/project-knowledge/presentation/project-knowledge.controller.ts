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
import type { ProjectKnowledge, ProjectKnowledgeListResponse } from "@ai-context/contracts";

import { Auth } from "../../auth/decorators/auth.decorator.js";
import { CurrentUser } from "../../auth/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../../auth/types/authenticated-user.js";
import { ProjectKnowledgeService } from "../application/project-knowledge.service.js";
// ValidationPipe needs this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CreateProjectKnowledgeDto } from "./dto/create-project-knowledge.dto.js";
// ValidationPipe needs this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ProjectKnowledgeParamsDto } from "./dto/project-knowledge-params.dto.js";
// ValidationPipe needs this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ProjectKnowledgeQueryDto } from "./dto/project-knowledge-query.dto.js";
import {
  ProjectKnowledgeListResponseDto,
  ProjectKnowledgeResponseDto,
  toProjectKnowledgeListResponse,
  toProjectKnowledgeResponse
} from "./dto/project-knowledge-response.dto.js";
// ValidationPipe needs this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { UpdateProjectKnowledgeDto } from "./dto/update-project-knowledge.dto.js";

@ApiTags("project-knowledge")
@Auth()
@Controller({ path: "repositories/:id/knowledge", version: "1" })
export class ProjectKnowledgeController {
  constructor(@Inject(ProjectKnowledgeService) private readonly service: ProjectKnowledgeService) {}

  @Get()
  @ApiOkResponse({ type: ProjectKnowledgeListResponseDto })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: ProjectKnowledgeParamsDto,
    @Query() query: ProjectKnowledgeQueryDto
  ): Promise<ProjectKnowledgeListResponse> {
    return toProjectKnowledgeListResponse(
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
  @ApiCreatedResponse({ type: ProjectKnowledgeResponseDto })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: ProjectKnowledgeParamsDto,
    @Body() dto: CreateProjectKnowledgeDto
  ): Promise<ProjectKnowledge> {
    return toProjectKnowledgeResponse(await this.service.create(user.id, params.id, dto));
  }

  @Patch(":knowledgeId")
  @ApiOkResponse({ type: ProjectKnowledgeResponseDto })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: ProjectKnowledgeParamsDto,
    @Body() dto: UpdateProjectKnowledgeDto
  ): Promise<ProjectKnowledge> {
    return toProjectKnowledgeResponse(
      await this.service.update(user.id, params.id, params.knowledgeId, dto)
    );
  }
}
