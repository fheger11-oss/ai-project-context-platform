import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class GitHubAccessTokenDto {
  @ApiProperty({
    description: "GitHub access token from the authenticated GitHub account.",
    minLength: 20
  })
  @IsString()
  @MinLength(20)
  accessToken!: string;
}
