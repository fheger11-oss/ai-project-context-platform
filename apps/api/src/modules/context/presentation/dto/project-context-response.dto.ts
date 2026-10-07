import { ApiProperty } from "@nestjs/swagger";
import type {
  ProjectContextHistoryItem,
  ProjectContextHistoryResponse,
  ProjectContextResponse
} from "@ai-context/contracts";

import type { PersistedProjectContext } from "../../domain/contracts/project-context-repository.contract.js";
import { EMPTY_PROJECT_CONTEXT_SEMANTIC } from "../../domain/project-context-semantic.js";

export type { ProjectContextHistoryItem, ProjectContextHistoryResponse, ProjectContextResponse };

export class ContextSectionDto {
  @ApiProperty({ type: "array", items: { type: "object", additionalProperties: true } })
  claims!: unknown[];
}

export class ProjectContextResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  contextId!: string;

  @ApiProperty()
  analysisId!: string;

  @ApiProperty()
  scanId!: string;

  @ApiProperty()
  repositoryId!: string;

  @ApiProperty()
  commitSha!: string;

  @ApiProperty()
  contextVersion!: string;

  @ApiProperty({ format: "date-time" })
  generatedAt!: string;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;

  @ApiProperty({ type: ContextSectionDto })
  project!: ContextSectionDto;

  @ApiProperty({ type: ContextSectionDto })
  technology!: ContextSectionDto;

  @ApiProperty({ type: ContextSectionDto })
  structure!: ContextSectionDto;

  @ApiProperty({ type: ContextSectionDto })
  architecture!: ContextSectionDto;

  @ApiProperty({ type: ContextSectionDto })
  entryPoints!: ContextSectionDto;

  @ApiProperty({ type: ContextSectionDto })
  testing!: ContextSectionDto;

  @ApiProperty({ type: ContextSectionDto })
  infrastructure!: ContextSectionDto;

  @ApiProperty({ type: "array", items: { type: "object", additionalProperties: true } })
  ambiguities!: unknown[];

  @ApiProperty({ type: "object", additionalProperties: true })
  semantic!: NonNullable<ProjectContextResponse["semantic"]>;
}

export class ProjectContextHistoryItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  contextId!: string;

  @ApiProperty()
  analysisId!: string;

  @ApiProperty()
  scanId!: string;

  @ApiProperty()
  repositoryId!: string;

  @ApiProperty()
  commitSha!: string;

  @ApiProperty()
  contextVersion!: string;

  @ApiProperty({ format: "date-time" })
  generatedAt!: string;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;
}

export class ProjectContextHistoryResponseDto {
  @ApiProperty({ type: [ProjectContextHistoryItemDto] })
  items!: ProjectContextHistoryItemDto[];
}

export function toProjectContextResponse(context: PersistedProjectContext): ProjectContextResponse {
  const snapshot = context.context.toSnapshot();

  return {
    id: context.id,
    contextId: context.contextId,
    analysisId: context.analysisId,
    scanId: context.scanId,
    repositoryId: context.repositoryId,
    commitSha: context.commitSha,
    contextVersion: context.contextVersion,
    generatedAt: context.generatedAt.toISOString(),
    createdAt: context.createdAt.toISOString(),
    project: snapshot.project,
    technology: snapshot.technology,
    structure: snapshot.structure,
    architecture: snapshot.architecture,
    entryPoints: snapshot.entryPoints,
    testing: snapshot.testing,
    infrastructure: snapshot.infrastructure,
    ambiguities: snapshot.ambiguities,
    semantic: snapshot.semantic ?? EMPTY_PROJECT_CONTEXT_SEMANTIC
  };
}

export function toProjectContextHistoryResponse(
  contexts: readonly PersistedProjectContext[]
): ProjectContextHistoryResponse {
  return {
    items: contexts.map(toProjectContextHistoryItem)
  };
}

function toProjectContextHistoryItem(context: PersistedProjectContext): ProjectContextHistoryItem {
  return {
    id: context.id,
    contextId: context.contextId,
    analysisId: context.analysisId,
    scanId: context.scanId,
    repositoryId: context.repositoryId,
    commitSha: context.commitSha,
    contextVersion: context.contextVersion,
    generatedAt: context.generatedAt.toISOString(),
    createdAt: context.createdAt.toISOString()
  };
}
