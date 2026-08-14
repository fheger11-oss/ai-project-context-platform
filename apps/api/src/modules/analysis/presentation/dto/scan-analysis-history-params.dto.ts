import { IsString, MaxLength, MinLength } from "class-validator";

export class ScanAnalysisHistoryParamsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  scanId!: string;
}
