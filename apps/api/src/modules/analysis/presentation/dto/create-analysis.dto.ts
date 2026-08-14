import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

export class CreateAnalysisDto {
  @ApiProperty({ example: "clxscan123" })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  scanId!: string;
}
