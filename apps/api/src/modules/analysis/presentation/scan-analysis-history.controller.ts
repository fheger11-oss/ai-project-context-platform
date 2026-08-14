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
import { GetAnalysisHistoryService } from "../application/get-analysis-history.service.js";
import {
  AnalysisHistoryResponseDto,
  toAnalysisHistoryResponse,
  type AnalysisHistoryResponse
} from "./dto/analysis-history-response.dto.js";
// ValidationPipe needs this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ScanAnalysisHistoryParamsDto } from "./dto/scan-analysis-history-params.dto.js";

@ApiTags("analyses")
@Auth()
@Controller({
  path: "scans/:scanId/analyses",
  version: "1"
})
export class ScanAnalysisHistoryController {
  constructor(
    @Inject(GetAnalysisHistoryService)
    private readonly getAnalysisHistoryService: GetAnalysisHistoryService
  ) {}

  @Get()
  @ApiParam({ name: "scanId", type: "string" })
  @ApiOkResponse({
    description: "Lightweight analysis history for a scan.",
    type: AnalysisHistoryResponseDto
  })
  @ApiNotFoundResponse({ description: "Scan was not found" })
  @ApiForbiddenResponse({ description: "Scan is not accessible" })
  async getByScan(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: ScanAnalysisHistoryParamsDto
  ): Promise<AnalysisHistoryResponse> {
    const history = await this.getAnalysisHistoryService.getByScan({
      userId: user.id,
      scanId: params.scanId
    });

    return toAnalysisHistoryResponse(history);
  }
}
