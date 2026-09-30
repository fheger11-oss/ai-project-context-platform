import { Controller, Get, Inject, Param, Query } from "@nestjs/common";
import { ApiExtraModels, ApiNotFoundResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { ProjectTimelineResponse } from "@ai-context/contracts";

import { Auth } from "../../auth/decorators/auth.decorator.js";
import { CurrentUser } from "../../auth/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../../auth/types/authenticated-user.js";
// ValidationPipe needs this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { RepositoryParamsDto } from "../../repositories/dto/repository-params.dto.js";
import { GetProjectTimelineService } from "../application/get-project-timeline.service.js";
// ValidationPipe needs this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ProjectTimelineQueryDto } from "./dto/project-timeline-query.dto.js";
import {
  ContextPromotedTimelineItemDto,
  DecisionEffectiveTimelineItemDto,
  ProjectTimelineResponseDto,
  RepositoryConnectedTimelineItemDto,
  RepositoryUpdateTimelineItemDto
} from "./dto/project-timeline-response.dto.js";

@ApiTags("project-timeline")
@ApiExtraModels(
  RepositoryConnectedTimelineItemDto,
  RepositoryUpdateTimelineItemDto,
  ContextPromotedTimelineItemDto,
  DecisionEffectiveTimelineItemDto
)
@Auth()
@Controller({ path: "repositories/:id/timeline", version: "1" })
export class ProjectTimelineController {
  constructor(
    @Inject(GetProjectTimelineService)
    private readonly service: GetProjectTimelineService
  ) {}

  @Get()
  @ApiOkResponse({ type: ProjectTimelineResponseDto })
  @ApiNotFoundResponse({ description: "Repository was not found" })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: RepositoryParamsDto,
    @Query() query: ProjectTimelineQueryDto
  ): Promise<ProjectTimelineResponse> {
    return this.service.get({
      userId: user.id,
      repositoryId: params.id,
      page: query.page,
      pageSize: query.pageSize
    });
  }
}
