import { ApiProperty } from "@nestjs/swagger";

class PaginationDto {
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty() hasNextPage!: boolean;
}

class ArchitectureProcessingSummaryDto {
  @ApiProperty({ enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "INCOMPATIBLE"] })
  status!: string;
  @ApiProperty() projectContextId!: string;
  @ApiProperty() commitSha!: string;
  @ApiProperty() processorVersion!: string;
  @ApiProperty() analyzerVersion!: string;
  @ApiProperty() contextVersion!: string;
  @ApiProperty({ nullable: true, format: "date-time" }) startedAt!: string | null;
  @ApiProperty({ nullable: true, format: "date-time" }) completedAt!: string | null;
  @ApiProperty({ nullable: true }) failureCategory!: string | null;
  @ApiProperty() attemptCount!: number;
  @ApiProperty({ format: "date-time" }) nextAttemptAt!: string;
}

class ArchitectureFindingItemDto {
  @ApiProperty() occurrenceId!: string;
  @ApiProperty() projectContextId!: string;
  @ApiProperty() fingerprint!: string;
  @ApiProperty() ruleId!: string;
  @ApiProperty() ruleVersion!: string;
  @ApiProperty({ enum: ["APPLICABLE", "PARTIALLY_APPLICABLE"], nullable: true })
  applicability!: string | null;
  @ApiProperty({ enum: ["LOW", "MEDIUM", "HIGH"] }) confidence!: string;
  @ApiProperty({ enum: ["NEW", "PERSISTING", "RESOLVED", "RECURRING"], nullable: true })
  lifecycle!: string | null;
  @ApiProperty({ type: "object", additionalProperties: true }) subject!: object;
  @ApiProperty({ type: "array", items: { type: "object", additionalProperties: true } })
  evidence!: object[];
  @ApiProperty({ format: "date-time" }) createdAt!: string;
}

class ArchitectureModuleMeasurementDto {
  @ApiProperty() moduleId!: string;
  @ApiProperty() path!: string;
  @ApiProperty({ enum: ["LOW", "MEDIUM", "HIGH"] }) confidence!: string;
  @ApiProperty() sourceFileCount!: number;
  @ApiProperty() declarationCount!: number;
  @ApiProperty() fanIn!: number;
  @ApiProperty() fanOut!: number;
  @ApiProperty() totalDegree!: number;
  @ApiProperty() relationshipCount!: number;
}

class ArchitectureRelationshipReferenceDto {
  @ApiProperty() sourceModuleId!: string;
  @ApiProperty() targetModuleId!: string;
}

class ArchitectureChangesDto {
  @ApiProperty({ type: [String] }) addedModules!: string[];
  @ApiProperty({ type: [String] }) removedModules!: string[];
  @ApiProperty({ type: [ArchitectureRelationshipReferenceDto] })
  addedRelationships!: ArchitectureRelationshipReferenceDto[];
  @ApiProperty({ type: [ArchitectureRelationshipReferenceDto] })
  removedRelationships!: ArchitectureRelationshipReferenceDto[];
}

class ArchitectureIntelligenceDataDto {
  @ApiProperty({ enum: ["COMPARABLE", "INCOMPATIBLE", "NO_BASELINE"] }) compatibility!: string;
  @ApiProperty({ type: "object", additionalProperties: true }) architectureModel!: object;
  @ApiProperty({ type: "object", additionalProperties: { type: "number" } }) summary!: object;
  @ApiProperty({ type: "object", additionalProperties: true }) findings!: {
    items: ArchitectureFindingItemDto[];
    pagination: PaginationDto;
  };
  @ApiProperty({ type: "object", additionalProperties: true }) modules!: {
    items: ArchitectureModuleMeasurementDto[];
    pagination: PaginationDto;
  };
  @ApiProperty({ type: ArchitectureChangesDto }) changes!: ArchitectureChangesDto;
}

export class ArchitectureIntelligenceResponseDto {
  @ApiProperty({ type: ArchitectureProcessingSummaryDto, nullable: true })
  processing!: ArchitectureProcessingSummaryDto | null;
  @ApiProperty({ type: ArchitectureIntelligenceDataDto, nullable: true })
  intelligence!: ArchitectureIntelligenceDataDto | null;
}

class ArchitectureIntelligenceHistoryItemDto {
  @ApiProperty() historyId!: string;
  @ApiProperty({ format: "date-time" }) promotedAt!: string;
  @ApiProperty() projectContextId!: string;
  @ApiProperty() commitSha!: string;
  @ApiProperty({ type: ArchitectureProcessingSummaryDto, nullable: true })
  processing!: ArchitectureProcessingSummaryDto | null;
  @ApiProperty({ nullable: true }) ruleVersion!: string | null;
  @ApiProperty({ enum: ["COMPARABLE", "INCOMPATIBLE", "NO_BASELINE"], nullable: true })
  compatibility!: string | null;
  @ApiProperty({ type: "object", additionalProperties: { type: "number" } }) transitions!: object;
  @ApiProperty({ type: "object", additionalProperties: { type: "number" } }) changes!: object;
}

export class ArchitectureIntelligenceHistoryResponseDto {
  @ApiProperty({ type: [ArchitectureIntelligenceHistoryItemDto] })
  items!: ArchitectureIntelligenceHistoryItemDto[];
  @ApiProperty({ type: PaginationDto }) pagination!: PaginationDto;
}
