import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UnprocessableEntityException
} from "@nestjs/common";
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
import { ScanLimitExceededError } from "../domain/errors/scan-limit-exceeded.error.js";
import { SCAN_LIMITS } from "../domain/scan-limits.js";
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

type ScanResponse = Omit<
  ScanSnapshot,
  "totalSize" | "filesProcessed" | "totalBytesConsidered" | "scanLimitReason"
> & {
  totalSize: string;
  usage: {
    filesProcessed: number;
    totalBytesConsidered: string;
  };
  limit: {
    reached: boolean;
    reason: ScanSnapshot["scanLimitReason"];
  };
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
        usage: {
          type: "object",
          properties: {
            filesProcessed: { type: "number" },
            totalBytesConsidered: { type: "string" }
          }
        },
        limit: {
          type: "object",
          properties: {
            reached: { type: "boolean" },
            reason: {
              type: "string",
              enum: ["FILE_COUNT_LIMIT", "INDIVIDUAL_FILE_SIZE_LIMIT", "TOTAL_SIZE_LIMIT"],
              nullable: true
            }
          }
        },
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
    let snapshot: ScanSnapshot;

    try {
      snapshot = await this.scanService.startScan({
        repositoryId: dto.repositoryId,
        reference: dto.reference ?? "main",
        userId: user.id
      });
    } catch (error) {
      if (error instanceof ScanLimitExceededError) {
        throw this.toScanLimitException(error);
      }

      throw error;
    }

    return this.toResponse(snapshot);
  }

  @Get("limits")
  @ApiOkResponse({
    description: "Current per-scan repository processing limits.",
    schema: {
      type: "object",
      properties: {
        maxFiles: { type: "number" },
        maxIndividualFileSizeBytes: { type: "number" },
        maxTotalSizeBytes: { type: "number" }
      }
    }
  })
  getScanLimits() {
    return SCAN_LIMITS;
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
              usage: {
                type: "object",
                properties: {
                  filesProcessed: { type: "number" },
                  totalBytesConsidered: { type: "string" }
                }
              },
              limit: {
                type: "object",
                properties: {
                  reached: { type: "boolean" },
                  reason: {
                    type: "string",
                    enum: ["FILE_COUNT_LIMIT", "INDIVIDUAL_FILE_SIZE_LIMIT", "TOTAL_SIZE_LIMIT"],
                    nullable: true
                  }
                }
              },
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
      id: snapshot.id,
      repositoryId: snapshot.repositoryId,
      status: snapshot.status,
      commitSha: snapshot.commitSha,
      startedAt: snapshot.startedAt,
      completedAt: snapshot.completedAt,
      durationMs: snapshot.durationMs,
      totalFiles: snapshot.totalFiles,
      totalSize: snapshot.totalSize.toString(),
      usage: {
        filesProcessed: snapshot.filesProcessed,
        totalBytesConsidered: snapshot.totalBytesConsidered.toString()
      },
      limit: {
        reached: snapshot.scanLimitReason !== null,
        reason: snapshot.scanLimitReason
      },
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.updatedAt
    };
  }

  private toScanLimitException(error: ScanLimitExceededError): UnprocessableEntityException {
    return new UnprocessableEntityException({
      statusCode: 422,
      message: this.scanLimitMessage(error),
      error: "Scan Limit Reached",
      code: "SCAN_LIMIT_REACHED",
      limit: {
        reached: true,
        reason: error.reason
      },
      usage: {
        filesProcessed: error.usage.filesProcessed,
        totalBytesConsidered: error.usage.totalBytesConsidered.toString()
      },
      limits: error.limits,
      ...(error.filePath ? { filePath: error.filePath } : {})
    });
  }

  private scanLimitMessage(error: ScanLimitExceededError): string {
    if (error.reason === "FILE_COUNT_LIMIT") {
      return "This repository exceeds the file limit for a single scan.";
    }

    if (error.reason === "INDIVIDUAL_FILE_SIZE_LIMIT") {
      return "A non-binary file exceeds the maximum file size for a single scan.";
    }

    return "This repository exceeds the total file-data limit for a single scan.";
  }
}
