import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export class ConnectRepositoryDto {
  @ApiProperty({ example: "721902250" })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  @Matches(/^\d+$/)
  githubId!: string;
}
