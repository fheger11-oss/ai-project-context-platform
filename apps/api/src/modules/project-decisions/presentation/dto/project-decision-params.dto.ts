import { IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class ProjectDecisionParamsDto {
  @IsString()
  @MinLength(10)
  @MaxLength(32)
  @Matches(/^[a-z0-9]+$/i)
  id!: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(32)
  @Matches(/^[a-z0-9]+$/i)
  decisionId?: string;
}
