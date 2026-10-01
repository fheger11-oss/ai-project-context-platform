import { Transform } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import type { CreateProjectKnowledgeRequest } from "@ai-context/contracts";

import { PROJECT_KNOWLEDGE_CONTENT_MAX_LENGTH } from "../../domain/project-knowledge.js";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

export class CreateProjectKnowledgeDto implements CreateProjectKnowledgeRequest {
  @ApiProperty({ maxLength: PROJECT_KNOWLEDGE_CONTENT_MAX_LENGTH })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(PROJECT_KNOWLEDGE_CONTENT_MAX_LENGTH)
  content!: string;
}
