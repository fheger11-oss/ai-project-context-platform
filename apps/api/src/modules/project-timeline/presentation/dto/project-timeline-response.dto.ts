import { ApiProperty, getSchemaPath } from "@nestjs/swagger";
import type {
  ContextPromotedTimelineItem,
  DecisionEffectiveTimelineItem,
  ProjectTimelineItem,
  ProjectTimelineResponse,
  RepositoryConnectedTimelineItem,
  RepositoryUpdateTimelineItem
} from "@ai-context/contracts";

abstract class ProjectTimelineItemBaseDto {
  @ApiProperty()
  sourceId!: string;

  @ApiProperty()
  repositoryId!: string;

  @ApiProperty({ format: "date-time" })
  occurredAt!: string;
}

export class RepositoryConnectedTimelineItemDto
  extends ProjectTimelineItemBaseDto
  implements RepositoryConnectedTimelineItem
{
  @ApiProperty({ enum: ["REPOSITORY_CONNECTED"] })
  type!: "REPOSITORY_CONNECTED";

  @ApiProperty()
  repositoryName!: string;

  @ApiProperty()
  repositoryFullName!: string;
}

export class RepositoryUpdateTimelineItemDto
  extends ProjectTimelineItemBaseDto
  implements RepositoryUpdateTimelineItem
{
  @ApiProperty({ enum: ["REPOSITORY_UPDATE"] })
  type!: "REPOSITORY_UPDATE";

  @ApiProperty({ enum: ["MANUAL", "WEBHOOK", "SYSTEM"] })
  triggerType!: RepositoryUpdateTimelineItem["triggerType"];

  @ApiProperty({ enum: ["PENDING", "RUNNING", "COMPLETED", "FAILED"] })
  status!: RepositoryUpdateTimelineItem["status"];

  @ApiProperty({ nullable: true })
  baseCommitSha!: string | null;

  @ApiProperty()
  targetCommitSha!: string;

  @ApiProperty({ format: "date-time", nullable: true })
  startedAt!: string | null;

  @ApiProperty({ format: "date-time", nullable: true })
  completedAt!: string | null;

  @ApiProperty({ format: "date-time", nullable: true })
  failedAt!: string | null;

  @ApiProperty({ nullable: true })
  scanId!: string | null;

  @ApiProperty({ nullable: true })
  analysisId!: string | null;

  @ApiProperty({ nullable: true })
  projectContextId!: string | null;
}

export class ContextPromotedTimelineItemDto
  extends ProjectTimelineItemBaseDto
  implements ContextPromotedTimelineItem
{
  @ApiProperty({ enum: ["CONTEXT_PROMOTED"] })
  type!: "CONTEXT_PROMOTED";

  @ApiProperty()
  projectContextId!: string;

  @ApiProperty()
  contextId!: string;

  @ApiProperty()
  contextVersion!: string;

  @ApiProperty({ format: "date-time" })
  generatedAt!: string;

  @ApiProperty()
  commitSha!: string;

  @ApiProperty()
  scanId!: string;

  @ApiProperty()
  analysisId!: string;
}

export class DecisionEffectiveTimelineItemDto
  extends ProjectTimelineItemBaseDto
  implements DecisionEffectiveTimelineItem
{
  @ApiProperty({ enum: ["DECISION_EFFECTIVE"] })
  type!: "DECISION_EFFECTIVE";

  @ApiProperty()
  decisionId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  affectedArea!: string;

  @ApiProperty({ enum: ["ACTIVE", "SUPERSEDED", "ARCHIVED"] })
  status!: DecisionEffectiveTimelineItem["status"];

  @ApiProperty({ format: "date-time" })
  decidedAt!: string;

  @ApiProperty({ nullable: true })
  sourceProjectContextId!: string | null;

  @ApiProperty({ nullable: true })
  sourceRepositoryUpdateId!: string | null;

  @ApiProperty({ nullable: true })
  sourceCommitSha!: string | null;
}

export class ProjectTimelineResponseDto implements ProjectTimelineResponse {
  @ApiProperty({
    type: "array",
    items: {
      oneOf: [
        { $ref: getSchemaPath(RepositoryConnectedTimelineItemDto) },
        { $ref: getSchemaPath(RepositoryUpdateTimelineItemDto) },
        { $ref: getSchemaPath(ContextPromotedTimelineItemDto) },
        { $ref: getSchemaPath(DecisionEffectiveTimelineItemDto) }
      ],
      discriminator: { propertyName: "type" }
    }
  })
  items!: ProjectTimelineItem[];

  @ApiProperty({
    type: "object",
    additionalProperties: false,
    properties: {
      page: { type: "number" },
      pageSize: { type: "number" },
      total: { type: "number" },
      totalPages: { type: "number" },
      hasNextPage: { type: "boolean" },
      hasPreviousPage: { type: "boolean" }
    }
  })
  pagination!: ProjectTimelineResponse["pagination"];
}
