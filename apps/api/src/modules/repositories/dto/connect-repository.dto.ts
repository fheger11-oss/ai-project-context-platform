import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class ConnectRepositoryDto {
  @ApiProperty({
    description: "GitHub access token from the authenticated GitHub account.",
    minLength: 20
  })
  @IsString()
  @MinLength(20)
  accessToken!: string;

  @ApiProperty({ example: "721902250" })
  @IsString()
  @MinLength(1)
  githubId!: string;
}
