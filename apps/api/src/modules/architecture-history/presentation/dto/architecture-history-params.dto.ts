import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export class ArchitectureHistoryParamsDto {
  @IsString()
  @MinLength(10)
  @MaxLength(32)
  @Matches(/^[a-z0-9]+$/i)
  id!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(64)
  @Matches(/^[a-z0-9_]+$/i)
  historyId!: string;
}
