import { ApiProperty } from "@nestjs/swagger";

export class ArchitectureSnapshotSummaryDto {
  @ApiProperty() historyId!: string;
  @ApiProperty() projectContextId!: string;
  @ApiProperty() analysisId!: string;
  @ApiProperty() scanId!: string;
  @ApiProperty() commitSha!: string;
  @ApiProperty({ format: "date-time" }) promotedAt!: string;
  @ApiProperty({ format: "date-time" }) generatedAt!: string;
  @ApiProperty() contextVersion!: string;
  @ApiProperty() analyzerVersion!: string;
  @ApiProperty() hasPreviousSnapshot!: boolean;
  @ApiProperty({ enum: ["COMPARABLE", "INCOMPATIBLE", "INCOMPLETE", "NO_BASELINE"] })
  adjacentCompatibility!: string;
}

export class ArchitectureHistoryResponseDto {
  @ApiProperty({ type: [ArchitectureSnapshotSummaryDto] })
  items!: ArchitectureSnapshotSummaryDto[];
}

export class ArchitectureModuleDto {
  @ApiProperty() moduleId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() path!: string;
  @ApiProperty({ enum: ["MEDIUM", "HIGH"] }) confidence!: string;
}

export class ArchitectureRelationshipDto {
  @ApiProperty() sourceModuleId!: string;
  @ApiProperty() targetModuleId!: string;
  @ApiProperty({ enum: ["MEDIUM", "HIGH"] }) confidence!: string;
}

export class ModifiedArchitectureModuleDto {
  @ApiProperty({ type: ArchitectureModuleDto }) module!: ArchitectureModuleDto;
  @ApiProperty({ type: [ArchitectureRelationshipDto] })
  addedIncomingRelationships!: ArchitectureRelationshipDto[];
  @ApiProperty({ type: [ArchitectureRelationshipDto] })
  removedIncomingRelationships!: ArchitectureRelationshipDto[];
  @ApiProperty({ type: [ArchitectureRelationshipDto] })
  addedOutgoingRelationships!: ArchitectureRelationshipDto[];
  @ApiProperty({ type: [ArchitectureRelationshipDto] })
  removedOutgoingRelationships!: ArchitectureRelationshipDto[];
}

export class ArchitectureComparisonDiagnosticDto {
  @ApiProperty() code!: string;
  @ApiProperty() message!: string;
}

export class SuppressedArchitectureClaimDto {
  @ApiProperty() identity!: string;
  @ApiProperty({ enum: ["LOW_CONFIDENCE"] }) reason!: string;
}

export class ArchitectureComparisonResponseDto {
  @ApiProperty({ enum: ["COMPARABLE", "INCOMPATIBLE", "INCOMPLETE", "NO_BASELINE"] })
  status!: string;

  @ApiProperty({ type: ArchitectureSnapshotSummaryDto, nullable: true })
  baseline!: ArchitectureSnapshotSummaryDto | null;

  @ApiProperty({ type: ArchitectureSnapshotSummaryDto })
  target!: ArchitectureSnapshotSummaryDto;

  @ApiProperty({ type: [ArchitectureModuleDto], required: false })
  addedModules?: ArchitectureModuleDto[];

  @ApiProperty({ type: [ArchitectureModuleDto], required: false })
  removedModules?: ArchitectureModuleDto[];

  @ApiProperty({ type: [ModifiedArchitectureModuleDto], required: false })
  modifiedModules?: ModifiedArchitectureModuleDto[];

  @ApiProperty({ required: false }) unchangedModuleCount?: number;

  @ApiProperty({ type: [ArchitectureRelationshipDto], required: false })
  addedRelationships?: ArchitectureRelationshipDto[];

  @ApiProperty({ type: [ArchitectureRelationshipDto], required: false })
  removedRelationships?: ArchitectureRelationshipDto[];

  @ApiProperty({ required: false }) unchangedRelationshipCount?: number;

  @ApiProperty({ type: [SuppressedArchitectureClaimDto], required: false })
  suppressedClaims?: SuppressedArchitectureClaimDto[];

  @ApiProperty({ type: [ArchitectureComparisonDiagnosticDto], required: false })
  diagnostics?: ArchitectureComparisonDiagnosticDto[];
}
