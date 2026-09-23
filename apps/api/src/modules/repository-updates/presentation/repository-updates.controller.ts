import { Controller, HttpCode, HttpStatus, Inject, Param, Post } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { Auth } from "../../auth/decorators/auth.decorator.js";
import { CurrentUser } from "../../auth/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../../auth/types/authenticated-user.js";
import { type RepositoryParamsDto } from "../../repositories/dto/repository-params.dto.js";
import { RunRepositoryUpdateService } from "../application/run-repository-update.service.js";
import {
  RepositoryUpdateResponseDto,
  toRepositoryUpdateResponse,
  type RepositoryUpdateResponse
} from "./dto/repository-update-response.dto.js";

@ApiTags("repositories")
@Auth()
@Controller({
  path: "repositories/:id/updates",
  version: "1"
})
export class RepositoryUpdatesController {
  constructor(
    @Inject(RunRepositoryUpdateService)
    private readonly runRepositoryUpdateService: RunRepositoryUpdateService
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: RepositoryUpdateResponseDto })
  async runManualUpdate(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: RepositoryParamsDto
  ): Promise<RepositoryUpdateResponse> {
    const result = await this.runRepositoryUpdateService.runManualUpdate(params.id, user.id);

    return toRepositoryUpdateResponse(result);
  }
}
