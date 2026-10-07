import { ApiProperty } from "@nestjs/swagger";

class DependencyPaginationDto {
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty() hasNextPage!: boolean;
}

class DependencyProvenanceDto {
  @ApiProperty() repositoryId!: string;
  @ApiProperty() projectContextId!: string;
  @ApiProperty() analysisId!: string;
  @ApiProperty() commitSha!: string;
  @ApiProperty() analyzerVersion!: string;
  @ApiProperty() contextVersion!: string;
  @ApiProperty() dependencyProcessorVersion!: string;
}

class DependencyDeclarationDto {
  @ApiProperty() packageName!: string;
  @ApiProperty() declaredVersion!: string;
  @ApiProperty({ enum: ["DEPENDENCY", "DEV_DEPENDENCY", "PEER_DEPENDENCY", "OPTIONAL_DEPENDENCY"] })
  dependencyType!: string;
  @ApiProperty() manifestPath!: string;
}

class DependencyEvidenceDto extends DependencyDeclarationDto {
  @ApiProperty() projectContextId!: string;
  @ApiProperty() analysisId!: string;
  @ApiProperty() commitSha!: string;
}

class DependencyFindingDto {
  @ApiProperty() ruleId!: string;
  @ApiProperty() ruleVersion!: string;
  @ApiProperty() fingerprint!: string;
  @ApiProperty() packageName!: string;
  @ApiProperty({ enum: ["NEW", "PERSISTING", "RESOLVED", "RECURRING"] }) lifecycle!: string;
  @ApiProperty() projectContextId!: string;
  @ApiProperty() analysisId!: string;
  @ApiProperty() commitSha!: string;
  @ApiProperty({ type: [DependencyEvidenceDto] }) evidence!: DependencyEvidenceDto[];
}

class DependencySummaryDto {
  @ApiProperty() declarationCount!: number;
  @ApiProperty() distinctPackageCount!: number;
  @ApiProperty() divergenceFindingCount!: number;
}

class DependencyLifecycleCountsDto {
  @ApiProperty() new!: number;
  @ApiProperty() persisting!: number;
  @ApiProperty() resolved!: number;
  @ApiProperty() recurring!: number;
}

class DependencyChangeCountsDto {
  @ApiProperty() added!: number;
  @ApiProperty() removed!: number;
  @ApiProperty() versionChanged!: number;
  @ApiProperty() dependencyTypeChanged!: number;
}

class DependencyDeclarationsPageDto {
  @ApiProperty({ type: [DependencyDeclarationDto] }) items!: DependencyDeclarationDto[];
  @ApiProperty({ type: DependencyPaginationDto }) pagination!: DependencyPaginationDto;
}

class DependencyFindingsPageDto {
  @ApiProperty({ type: [DependencyFindingDto] }) items!: DependencyFindingDto[];
  @ApiProperty({ type: DependencyPaginationDto }) pagination!: DependencyPaginationDto;
}

class DependencyChangeDto {
  @ApiProperty({ enum: ["ADDED", "REMOVED", "VERSION_CHANGED", "DEPENDENCY_TYPE_CHANGED"] })
  type!: string;
  @ApiProperty() manifestPath!: string;
  @ApiProperty() packageName!: string;
  @ApiProperty({ required: false }) previousVersion?: string;
  @ApiProperty({ required: false }) currentVersion?: string;
  @ApiProperty({ required: false }) previousDependencyType?: string;
  @ApiProperty({ required: false }) currentDependencyType?: string;
}

class DependencyChangesPageDto {
  @ApiProperty({ type: [DependencyChangeDto] }) items!: DependencyChangeDto[];
  @ApiProperty({ type: DependencyPaginationDto }) pagination!: DependencyPaginationDto;
}

export class DependencyIntelligenceResponseDto {
  @ApiProperty() available!: boolean;
  @ApiProperty({ type: DependencyProvenanceDto, nullable: true }) provenance!: object | null;
  @ApiProperty({ enum: ["NO_BASELINE", "COMPARABLE", "INCOMPATIBLE"], nullable: true })
  compatibility!: string | null;
  @ApiProperty({ type: DependencySummaryDto, nullable: true })
  summary!: DependencySummaryDto | null;
  @ApiProperty({ type: DependencyDeclarationsPageDto }) declarations!: {
    items: DependencyDeclarationDto[];
    pagination: DependencyPaginationDto;
  };
  @ApiProperty({ type: DependencyFindingsPageDto }) findings!: {
    items: DependencyFindingDto[];
    pagination: DependencyPaginationDto;
  };
}

export class DependencyIntelligenceHistoryResponseDto {
  @ApiProperty() available!: boolean;
  @ApiProperty({ enum: ["NO_BASELINE", "COMPARABLE", "INCOMPATIBLE"], nullable: true })
  compatibility!: string | null;
  @ApiProperty({ type: DependencyProvenanceDto, nullable: true }) current!: object | null;
  @ApiProperty({ type: DependencyProvenanceDto, nullable: true }) previous!: object | null;
  @ApiProperty({ type: DependencyLifecycleCountsDto })
  lifecycleCounts!: DependencyLifecycleCountsDto;
  @ApiProperty({ type: DependencyChangeCountsDto }) changeCounts!: DependencyChangeCountsDto;
  @ApiProperty({ type: DependencyFindingsPageDto }) findings!: {
    items: DependencyFindingDto[];
    pagination: DependencyPaginationDto;
  };
  @ApiProperty({ type: DependencyChangesPageDto }) changes!: {
    items: DependencyChangeDto[];
    pagination: DependencyPaginationDto;
  };
}
