import { Body, Controller, Get, Inject, Param, Post, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags
} from "@nestjs/swagger";

import { Auth } from "../../auth/decorators/auth.decorator.js";
import { CurrentUser } from "../../auth/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../../auth/types/authenticated-user.js";
import { ScanHistoryAnalysisQueryService } from "../application/scan-history-analysis-query.service.js";
import { ScanService } from "../application/scan.service.js";
import type { ScanSnapshot } from "../domain/contracts/scan-repository.contract.js";
// Swagger and ValidationPipe need this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { StartScanDto } from "./dto/start-scan.dto.js";
// Swagger and ValidationPipe need this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import {
  DEFAULT_SCAN_HISTORY_PAGE,
  DEFAULT_SCAN_HISTORY_PAGE_SIZE,
  MAX_SCAN_HISTORY_PAGE_SIZE,
  ScanHistoryQueryDto
} from "./dto/scan-history-query.dto.js";

type ScanResponse = Omit<ScanSnapshot, "totalSize"> & {
  totalSize: string;
};

type ScanLatestAnalysisResponse = {
  analysisId: string;
  scanId: string;
  analyzerVersion: string;
  generatedAt: string;
  commitSha: string;
};

type ScanHistoryItemResponse = ScanResponse & {
  latestAnalysis: ScanLatestAnalysisResponse | null;
};

type ScanHistoryResponse = {
  items: ScanHistoryItemResponse[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

@ApiTags("scans")
@Controller({
  path: "scans",
  version: "1"
})
export class ScanController {
  constructor(
    @Inject(ScanService) private readonly scanService: ScanService,
    @Inject(ScanHistoryAnalysisQueryService)
    private readonly scanHistoryAnalysisQueryService: ScanHistoryAnalysisQueryService
  ) {}

  @Post("start")
  @ApiCreatedResponse({
    description: "Repository scan snapshot created and completed.",
    schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        repositoryId: { type: "string" },
        status: {
          type: "string",
          enum: ["PENDING", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"]
        },
        commitSha: { type: "string" },
        startedAt: { type: "string", format: "date-time", nullable: true },
        completedAt: { type: "string", format: "date-time", nullable: true },
        durationMs: { type: "number", nullable: true },
        totalFiles: { type: "number" },
        totalSize: { type: "string" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" }
      }
    }
  })
  @ApiBadRequestResponse({ description: "Invalid scan start request" })
  @ApiInternalServerErrorResponse({ description: "Scan could not be started" })
  @Auth()
  async startScan(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StartScanDto
  ): Promise<ScanResponse> {
    const snapshot = await this.scanService.startScan({
      repositoryId: dto.repositoryId,
      reference: dto.reference ?? "main",
      userId: user.id
    });

    return this.toResponse(snapshot);
  }

  @Get("repositories/:repositoryId/history")
  @ApiParam({ name: "repositoryId", type: "string" })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    example: DEFAULT_SCAN_HISTORY_PAGE,
    description: "One-based page number."
  })
  @ApiQuery({
    name: "pageSize",
    required: false,
    type: Number,
    example: DEFAULT_SCAN_HISTORY_PAGE_SIZE,
    description: `Items per page. Maximum ${MAX_SCAN_HISTORY_PAGE_SIZE}.`
  })
  @ApiOkResponse({
    description: "Repository scan history.",
    schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              repositoryId: { type: "string" },
              status: {
                type: "string",
                enum: ["PENDING", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"]
              },
              commitSha: { type: "string" },
              startedAt: { type: "string", format: "date-time", nullable: true },
              completedAt: { type: "string", format: "date-time", nullable: true },
              durationMs: { type: "number", nullable: true },
              totalFiles: { type: "number" },
              totalSize: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" }
            }
          }
        },
        pagination: {
          type: "object",
          properties: {
            page: { type: "number" },
            pageSize: { type: "number" },
            totalItems: { type: "number" },
            totalPages: { type: "number" }
          }
        }
      }
    }
  })
  @ApiBadRequestResponse({ description: "Invalid scan history pagination request" })
  @ApiNotFoundResponse({ description: "Repository was not found" })
  @ApiInternalServerErrorResponse({ description: "Scan history could not be loaded" })
  @Auth()
  async getRepositoryScanHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param("repositoryId") repositoryId: string,
    @Query() query: ScanHistoryQueryDto
  ): Promise<ScanHistoryResponse> {
    const history = await this.scanService.getScanHistory({
      userId: user.id,
      repositoryId,
      page: query.page,
      pageSize: query.pageSize
    });

    const latestAnalysesByScanId =
      await this.scanHistoryAnalysisQueryService.getLatestCompletedByScanId(history.items);

    return {
      items: history.items.map((snapshot) => ({
        ...this.toResponse(snapshot),
        latestAnalysis: latestAnalysesByScanId.get(snapshot.id) ?? null
      })),
      pagination: history.pagination
    };
  }

  private toResponse(snapshot: ScanSnapshot): ScanResponse {
    return {
      ...snapshot,
      totalSize: snapshot.totalSize.toString()
    };
  }
}
