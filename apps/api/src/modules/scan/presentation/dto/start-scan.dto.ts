import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class StartScanDto {
  @ApiProperty({ example: "clxrepository123" })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  repositoryId!: string;

  @ApiPropertyOptional({ example: "main" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  reference?: string;
}
