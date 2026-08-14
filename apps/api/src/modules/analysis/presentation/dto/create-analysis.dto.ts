import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";
import type { CreateAnalysisRequest } from "@ai-context/contracts";

export class CreateAnalysisDto implements CreateAnalysisRequest {
  @ApiProperty({ example: "clxscan123" })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  scanId!: string;
}
