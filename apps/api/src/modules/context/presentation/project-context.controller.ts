import { Controller, Get, Inject, Param } from "@nestjs/common";
import {
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags
} from "@nestjs/swagger";

import { Auth } from "../../auth/decorators/auth.decorator.js";
import { CurrentUser } from "../../auth/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../../auth/types/authenticated-user.js";
import { GetProjectContextService } from "../application/get-project-context.service.js";
// ValidationPipe needs this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ContextParamsDto } from "./dto/context-params.dto.js";
import {
  ProjectContextResponseDto,
  toProjectContextResponse,
  type ProjectContextResponse
} from "./dto/project-context-response.dto.js";

@ApiTags("contexts")
@Auth()
@Controller({
  path: "contexts",
  version: "1"
})
export class ProjectContextController {
  constructor(
    @Inject(GetProjectContextService)
    private readonly getProjectContextService: GetProjectContextService
  ) {}

  @Get(":contextId")
  @ApiParam({ name: "contextId", type: "string" })
  @ApiOkResponse({
    description: "Persisted ProjectContext.",
    type: ProjectContextResponseDto
  })
  @ApiNotFoundResponse({ description: "Context was not found" })
  @ApiForbiddenResponse({ description: "Context is not accessible" })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: ContextParamsDto
  ): Promise<ProjectContextResponse> {
    const context = await this.getProjectContextService.get({
      userId: user.id,
      contextId: params.contextId
    });

    return toProjectContextResponse(context);
  }
}
