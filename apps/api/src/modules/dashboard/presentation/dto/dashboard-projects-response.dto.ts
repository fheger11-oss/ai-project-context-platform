import { ApiProperty } from "@nestjs/swagger";
import type {
  DashboardProjectAiExportSummary,
  DashboardProjectDocumentsSummary,
  DashboardProjectLatestAnalysisSummary,
  DashboardProjectLatestContextSummary,
  DashboardProjectLatestScanSummary,
  DashboardProjectRepositorySummary,
  DashboardProjectSummary,
  DashboardProjectsResponse
} from "@ai-context/contracts";

export type { DashboardProjectsResponse };

export class DashboardProjectRepositorySummaryDto implements DashboardProjectRepositorySummary {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  owner!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  defaultBranch!: string;

  @ApiProperty({ enum: ["PUBLIC", "PRIVATE", "INTERNAL"] })
  visibility!: DashboardProjectRepositorySummary["visibility"];

  @ApiProperty({ nullable: true })
  language!: string | null;

  @ApiProperty()
  isArchived!: boolean;

  @ApiProperty({ format: "date-time" })
  lastSyncedAt!: string;
}

export class DashboardProjectLatestScanSummaryDto implements DashboardProjectLatestScanSummary {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ["PENDING", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"] })
  status!: DashboardProjectLatestScanSummary["status"];

  @ApiProperty()
  commitSha!: string;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;

  @ApiProperty({ format: "date-time" })
  updatedAt!: string;

  @ApiProperty({ format: "date-time", nullable: true })
  completedAt!: string | null;

  @ApiProperty()
  totalFiles!: number;

  @ApiProperty()
  totalSize!: string;

  @ApiProperty({
    type: "object",
    additionalProperties: false,
    properties: {
      filesProcessed: { type: "number" },
      totalBytesConsidered: { type: "string" }
    }
  })
  usage!: DashboardProjectLatestScanSummary["usage"];

  @ApiProperty({
    type: "object",
    additionalProperties: false,
    properties: {
      reached: { type: "boolean" },
      reason: {
        type: "string",
        enum: ["FILE_COUNT_LIMIT", "INDIVIDUAL_FILE_SIZE_LIMIT", "TOTAL_SIZE_LIMIT"],
        nullable: true
      }
    }
  })
  limit!: DashboardProjectLatestScanSummary["limit"];
}

export class DashboardProjectLatestAnalysisSummaryDto implements DashboardProjectLatestAnalysisSummary {
  @ApiProperty()
  analysisId!: string;

  @ApiProperty()
  scanId!: string;

  @ApiProperty()
  analyzerVersion!: string;

  @ApiProperty()
  commitSha!: string;

  @ApiProperty({ format: "date-time" })
  generatedAt!: string;
}

export class DashboardProjectLatestContextSummaryDto implements DashboardProjectLatestContextSummary {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  contextId!: string;

  @ApiProperty()
  contextVersion!: string;

  @ApiProperty({ format: "date-time" })
  generatedAt!: string;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;
}

export class DashboardProjectDocumentsSummaryDto implements DashboardProjectDocumentsSummary {
  @ApiProperty()
  available!: boolean;

  @ApiProperty()
  count!: number;
}

export class DashboardProjectAiExportSummaryDto implements DashboardProjectAiExportSummary {
  @ApiProperty()
  available!: boolean;
}

export class DashboardProjectSummaryDto implements DashboardProjectSummary {
  @ApiProperty({ type: DashboardProjectRepositorySummaryDto })
  repository!: DashboardProjectRepositorySummaryDto;

  @ApiProperty({ type: DashboardProjectLatestScanSummaryDto, nullable: true })
  latestScan!: DashboardProjectLatestScanSummaryDto | null;

  @ApiProperty({ type: DashboardProjectLatestAnalysisSummaryDto, nullable: true })
  latestAnalysis!: DashboardProjectLatestAnalysisSummaryDto | null;

  @ApiProperty({ type: DashboardProjectLatestContextSummaryDto, nullable: true })
  latestContext!: DashboardProjectLatestContextSummaryDto | null;

  @ApiProperty({ type: DashboardProjectDocumentsSummaryDto })
  documents!: DashboardProjectDocumentsSummaryDto;

  @ApiProperty({ type: DashboardProjectAiExportSummaryDto })
  aiExport!: DashboardProjectAiExportSummaryDto;
}

export class DashboardProjectsResponseDto implements DashboardProjectsResponse {
  @ApiProperty({ type: [DashboardProjectSummaryDto] })
  projects!: DashboardProjectSummaryDto[];
}
