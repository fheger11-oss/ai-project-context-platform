import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Equals, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

const GITHUB_OAUTH_ISSUER = "https://github.com/login/oauth";
const GITHUB_OAUTH_CODE_MAX_LENGTH = 512;
const GITHUB_OAUTH_STATE_MAX_LENGTH = 2_048;

export class GitHubCallbackDto {
  @ApiProperty({ maxLength: GITHUB_OAUTH_CODE_MAX_LENGTH })
  @IsString()
  @MinLength(1)
  @MaxLength(GITHUB_OAUTH_CODE_MAX_LENGTH)
  code!: string;

  @ApiProperty({ maxLength: GITHUB_OAUTH_STATE_MAX_LENGTH })
  @IsString()
  @MinLength(1)
  @MaxLength(GITHUB_OAUTH_STATE_MAX_LENGTH)
  state!: string;

  @ApiPropertyOptional({ enum: [GITHUB_OAUTH_ISSUER] })
  @IsOptional()
  @IsString()
  @Equals(GITHUB_OAUTH_ISSUER)
  iss?: string;
}
