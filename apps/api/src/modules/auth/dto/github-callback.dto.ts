import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Equals, IsOptional, IsString, MinLength } from "class-validator";

const GITHUB_OAUTH_ISSUER = "https://github.com/login/oauth";

export class GitHubCallbackDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  code!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  state!: string;

  @ApiPropertyOptional({ enum: [GITHUB_OAUTH_ISSUER] })
  @IsOptional()
  @IsString()
  @Equals(GITHUB_OAUTH_ISSUER)
  iss?: string;
}
