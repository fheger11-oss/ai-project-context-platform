import { Body, Controller, Inject, Post } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiTags
} from "@nestjs/swagger";

import { ScanService } from "../application/scan.service.js";
import type { ScanSnapshot } from "../domain/contracts/scan-repository.contract.js";
// Swagger and ValidationPipe need this DTO as a runtime value.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { StartScanDto } from "./dto/start-scan.dto.js";

type ScanResponse = Omit<ScanSnapshot, "totalSize"> & {
  totalSize: string;
};

@ApiTags("scans")
@Controller({
  path: "scans",
  version: "1"
})
export class ScanController {
  constructor(@Inject(ScanService) private readonly scanService: ScanService) {}

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
  async startScan(@Body() dto: StartScanDto): Promise<ScanResponse> {
    const snapshot = await this.scanService.startScan({
      repositoryId: dto.repositoryId,
      reference: dto.reference ?? "main"
    });

    return this.toResponse(snapshot);
  }

  private toResponse(snapshot: ScanSnapshot): ScanResponse {
    return {
      ...snapshot,
      totalSize: snapshot.totalSize.toString()
    };
  }
}
