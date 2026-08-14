import { IsString, MaxLength, MinLength } from "class-validator";

export class AnalysisParamsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  analysisId!: string;
}
