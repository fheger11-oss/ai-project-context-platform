import { Controller, Get, Inject } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { Auth } from "../auth/decorators/auth.decorator.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.js";
import { DashboardProjectsQueryService } from "./dashboard-projects-query.service.js";
import {
  DashboardProjectsResponseDto,
  type DashboardProjectsResponse
} from "./presentation/dto/dashboard-projects-response.dto.js";

@ApiTags("dashboard")
@Auth()
@Controller({
  path: "dashboard",
  version: "1"
})
export class DashboardController {
  constructor(
    @Inject(DashboardProjectsQueryService)
    private readonly dashboardProjectsQueryService: DashboardProjectsQueryService
  ) {}

  @Get("projects")
  @ApiOkResponse({
    description: "Dashboard project summaries for repositories owned by the authenticated user.",
    type: DashboardProjectsResponseDto
  })
  listProjects(@CurrentUser() user: AuthenticatedUser): Promise<DashboardProjectsResponse> {
    return this.dashboardProjectsQueryService.listProjects(user.id);
  }
}
