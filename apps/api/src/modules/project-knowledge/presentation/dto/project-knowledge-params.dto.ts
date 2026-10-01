import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches, MaxLength, MinLength } from "class-validator";

const ID_PATTERN = /^[a-z0-9]+$/i;

export class ProjectKnowledgeParamsDto {
  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(32)
  @Matches(ID_PATTERN)
  id!: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(32)
  @Matches(ID_PATTERN)
  knowledgeId!: string;
}
